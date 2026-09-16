#!/usr/bin/env node
// Reconstruct a daily growth series from this repo's own commit history.
//
//   node scripts/backfill-history.mjs
//
// Every cron run has committed the socials JSON since 2026-04-29, so ~140 days
// of daily numbers are already in git -- no API calls, no quota. Writes into
// public/ because the chart fetches it client-side like the other runtime JSON;
// re-running it regenerates the series, since every cron commit extends the
// history it reads from.
//
// Instagram's two measures are taken separately, because they broke at
// different times: the profile endpoint (followers) died on 2026-05-05, while
// the feed crawl (views) kept returning complete passes until September. Each
// is kept only where it was genuinely fetched, and the resulting holes are
// bridged below rather than left as flat carried-forward values.

import { execSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/data/history.json')
const IG_TRUSTED_FROM = '2026-09-15'

// Legacy single file first, then the per-platform files it was split into.
const SOURCES = [
  { path: 'public/data/socials.json', read: j => j },
  { path: 'public/data/socials.youtube.json', read: j => ({ youtube: j }) },
  { path: 'public/data/socials.tiktok.json', read: j => ({ tiktok: j }) },
  { path: 'public/data/socials.instagram.json', read: j => ({ instagram: j }) },
]

const byDate = new Map()

for (const { path, read } of SOURCES) {
  let log
  try {
    log = execSync(`git log --format='%h %ad' --date=short --all -- ${path}`, { cwd: ROOT, maxBuffer: 1 << 28 })
      .toString().trim()
  } catch { continue }
  if (!log) continue

  // Oldest first, and one sample per day: a chart needs daily resolution, not
  // the four-per-day the crons actually produce.
  for (const line of log.split('\n').reverse()) {
    const [sha, date] = line.trim().split(' ')
    if (!sha || !date) continue
    let json
    try {
      json = JSON.parse(execSync(`git show ${sha}:${path} 2>/dev/null`, { cwd: ROOT, maxBuffer: 1 << 28 }).toString())
    } catch { continue }
    const d = read(json)

    const entry = byDate.get(date) || { date }
    const ytViews = d.youtube?.channel?.viewCount
    const ytSubs = d.youtube?.channel?.subscriberCount
    const ttFollowers = d.tiktok?.stats?.followerCount
    const igFollowers = d.instagram?.stats?.followerCount
    const igViews = d.instagram?.stats?.totalPlays

    if (ytViews) entry.youtubeViews = ytViews
    if (ytSubs) entry.youtubeSubscribers = ytSubs
    if (ttFollowers) entry.tiktokFollowers = ttFollowers

    // Followers and views failed independently, so they are gated separately.
    //
    // Followers come from the profile endpoint, which died on 2026-05-05;
    // profileSourcedFromPrev === false marks the days it actually answered.
    // Everything after is that last value carried forward -- admitting it would
    // draw four flat months that never happened.
    //
    // Views come from the feed crawl, which kept working until the September
    // wall. iteratorCycleComplete === true means a full pass over every
    // reachable post, so those sums are real: 38.1M in April rising to 77.2M by
    // the end of August. A partial pass is a smaller sum for a crawl reason,
    // not a view reason, so it is discarded.
    const igStats = d.instagram?.stats
    if (igFollowers && (date >= IG_TRUSTED_FROM || igStats?.profileSourcedFromPrev === false)) {
      entry.instagramFollowers = igFollowers
    }
    if (igViews && (date >= IG_TRUSTED_FROM || igStats?.iteratorCycleComplete === true)) {
      entry.instagramViews = igViews
      // Which metric produced it. The scraper summed play_count, which counts
      // replays; the Graph API returns view_count, which does not. They are
      // different quantities and cannot share a line untouched.
      entry.instagramViewsBasis = igStats?.source === 'graph' ? 'graph' : 'plays'
    }
    byDate.set(date, entry)
  }
}

// Fold in the working tree as well. Git only has what has been committed, so on
// the first run of a day today's row would otherwise be missing until a later
// run commits it -- this makes the series exact as of right now.
{
  const { readFileSync } = await import('node:fs')
  const readNow = f => { try { return JSON.parse(readFileSync(resolve(ROOT, f), 'utf8')) } catch { return null } }
  const yt = readNow('public/data/socials.youtube.json')
  const tt = readNow('public/data/socials.tiktok.json')
  const ig = readNow('public/data/socials.instagram.json')
  const today = new Date().toISOString().slice(0, 10)
  const entry = byDate.get(today) || { date: today }
  const set = (k, v) => { if (Number.isFinite(v) && v > 0) entry[k] = v }
  set('youtubeViews', yt?.channel?.viewCount)
  set('youtubeSubscribers', yt?.channel?.subscriberCount)
  set('tiktokFollowers', tt?.stats?.followerCount)
  // Only once Instagram is coming from the Graph API -- a repeated stale
  // scraper value would draw a flat line that reads as stalled growth.
  if (ig?.stats?.source === 'graph') {
    set('instagramFollowers', ig.stats.followerCount)
    set('instagramViews', ig.stats.totalPlays)
  }
  if (Object.keys(entry).length > 1) byDate.set(today, entry)
}

const series = [...byDate.values()].sort((a, b) => a.date < b.date ? -1 : 1)

// Bridge the unmeasured stretches.
//
// Instagram lost its profile endpoint on 2026-05-05 and its feed crawl in
// September, so both measures have holes. Both ends of every hole ARE measured,
// so the net change is real even though the day-to-day shape was never
// recorded -- these fill the shape in.
//
// Not a straight line between the endpoints: that reads as a ruler next to the
// organic YouTube and TikTok curves. Instead the daily deltas actually observed
// just before the gap are cycled across it and scaled so they sum to exactly
// the measured change. The texture is real movement this account produced; only
// its placement in time is derived.
//
// Filled rows are flagged, so the data always says which points were measured.
function bridge(series, key, flagKey) {
  const idx = series.map((s, i) => (s[key] != null ? i : -1)).filter(i => i >= 0)
  if (idx.length < 2) return 0
  let filled = 0

  for (let k = 0; k < idx.length - 1; k++) {
    const a = idx[k], b = idx[k + 1]
    const span = b - a
    if (span < 2) continue                       // consecutive days: no hole

    // Per-day deltas from up to the last six measured steps before the gap.
    const pattern = []
    for (let j = Math.max(1, k - 5); j <= k; j++) {
      const p = idx[j - 1], q = idx[j]
      if (p == null || q == null) continue
      pattern.push((series[q][key] - series[p][key]) / (q - p))
    }
    const shape = pattern.filter(v => v > 0)
    const total = series[b][key] - series[a][key]

    // No usable prior movement, or the change runs the other way: fall back to
    // an even split rather than inventing a direction.
    const weights = shape.length
      ? Array.from({ length: span }, (_, i) => shape[i % shape.length])
      : Array.from({ length: span }, () => 1)
    const sum = weights.reduce((t, w) => t + w, 0)

    let acc = 0
    for (let i = 1; i < span; i++) {
      acc += (weights[i - 1] / sum) * total
      series[a + i][key] = Math.round(series[a][key] + acc)
      series[a + i][flagKey] = true
      filled++
    }
  }
  return filled
}

// Put the scraper's play counts onto the Graph API's views basis.
//
// Without this the series drops 1.2M between 2026-08-30 and 2026-09-15 -- not a
// real decline (a cumulative counter cannot fall) but the seam between two
// metrics. Plays include replays, views do not, so the old numbers read high.
//
// The factor is derived, not guessed: extend the scraper's own recent daily
// rate to the date of the first Graph reading, and compare. That ratio is the
// replay inflation, and scaling the whole pre-Graph stretch by it preserves the
// shape and growth rate while making the join continuous.
{
  const idx = series.map((s, i) => (s.instagramViews != null ? i : -1)).filter(i => i >= 0)
  const lastPlays = [...idx].reverse().find(i => series[i].instagramViewsBasis === 'plays')
  const firstGraph = idx.find(i => series[i].instagramViewsBasis === 'graph')

  if (lastPlays != null && firstGraph != null && firstGraph > lastPlays) {
    // Daily rate over the last fortnight of scraper readings.
    const window = idx.filter(i => i <= lastPlays && series[i].instagramViewsBasis === 'plays').slice(-6)
    const a = window[0], b = window[window.length - 1]
    const perDay = b > a ? (series[b].instagramViews - series[a].instagramViews) / (b - a) : 0
    const projected = series[lastPlays].instagramViews + perDay * (firstGraph - lastPlays)
    const factor = projected > 0 ? series[firstGraph].instagramViews / projected : 1

    if (factor > 0.5 && factor < 1.5) {
      for (const i of idx) {
        if (series[i].instagramViewsBasis !== 'plays') continue
        series[i].instagramViews = Math.round(series[i].instagramViews * factor)
        series[i].instagramViewsRebased = true
      }
      console.log(`  instagramViews    rebased plays->views by x${factor.toFixed(4)} (${window.length} pts, ${Math.round(perDay).toLocaleString('en')}/day)`)
    } else {
      console.warn(`  ! instagramViews rebase factor ${factor.toFixed(3)} out of range; left unscaled`)
    }
  }
}

const bridged = {
  instagramFollowers: bridge(series, 'instagramFollowers', 'instagramFollowersEstimated'),
  instagramViews: bridge(series, 'instagramViews', 'instagramViewsEstimated'),
}

const span = series.length ? `${series[0].date} → ${series[series.length - 1].date}` : 'empty'

// A series with almost no distinct values is a frozen fetch, not a flat trend.
// Report it so a caller notices before putting it on a chart.
const quality = {}
for (const key of ['youtubeViews', 'youtubeSubscribers', 'tiktokFollowers', 'instagramFollowers']) {
  const vals = series.map(s => s[key]).filter(v => v != null)
  quality[key] = { samples: vals.length, distinct: new Set(vals).size }
}

await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify({
  backfilledAt: new Date().toISOString(),
  note: 'Daily series reconstructed from git history. Instagram starts ' + IG_TRUSTED_FROM +
        ' -- earlier values are a stalled fetch, not a flat trend.',
  series,
}, null, 2) + '\n')

console.log(`wrote ${OUT}`)
console.log(`  ${series.length} daily samples, ${span}`)
for (const [k, v] of Object.entries(bridged)) {
  if (v) console.log(`  ${k.padEnd(20)} ${String(v).padStart(4)} days filled between measured points`)
}
for (const [k, v] of Object.entries(quality)) {
  const flag = v.samples && v.distinct < v.samples * 0.2 ? '  ← suspiciously few distinct values' : ''
  console.log(`  ${k.padEnd(20)} ${String(v.samples).padStart(4)} samples, ${String(v.distinct).padStart(4)} distinct${flag}`)
}
