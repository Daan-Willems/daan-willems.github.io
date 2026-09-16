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
// Instagram is deliberately excluded before the Graph migration. Its follower
// count has only 6 distinct values across 129 samples in that period, because
// the scraper's profile endpoint was already failing and the last good value
// was being carried forward. Plotting it would draw a flat line that is an
// artefact of a broken fetch, then a 30k vertical jump on the day it was fixed.

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
    if (date >= IG_TRUSTED_FROM) {
      if (igFollowers) entry.instagramFollowers = igFollowers
      if (igViews) entry.instagramViews = igViews
    }
    byDate.set(date, entry)
  }
}

const series = [...byDate.values()].sort((a, b) => a.date < b.date ? -1 : 1)
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
for (const [k, v] of Object.entries(quality)) {
  const flag = v.samples && v.distinct < v.samples * 0.2 ? '  ← suspiciously few distinct values' : ''
  console.log(`  ${k.padEnd(20)} ${String(v.samples).padStart(4)} samples, ${String(v.distinct).padStart(4)} distinct${flag}`)
}
