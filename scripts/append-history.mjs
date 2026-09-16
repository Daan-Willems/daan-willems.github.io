#!/usr/bin/env node
// Append today's numbers to public/data/history.json.
//
//   node scripts/append-history.mjs
//
// Runs after the YouTube fetch, and only there. history.json is the one file
// that spans all three platforms, so exactly one workflow may write it --
// otherwise three jobs would edit the same path and the rebase-on-push that
// keeps the per-platform files conflict-free would stop working.
//
// It reads the other platforms from their committed JSON rather than fetching
// them: at checkout those files hold each platform's most recent run, at most a
// few hours old, which is ample for a daily series. That keeps this O(1) --
// backfill-history.mjs re-derives the whole series from git and is a one-off,
// too slow and too dependent on full clone depth to run on every cron.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const HISTORY = resolve(ROOT, 'public/data/history.json')

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')) } catch { return null }
}

const [yt, tt, ig, existing] = await Promise.all([
  readJson(resolve(ROOT, 'public/data/socials.youtube.json')),
  readJson(resolve(ROOT, 'public/data/socials.tiktok.json')),
  readJson(resolve(ROOT, 'public/data/socials.instagram.json')),
  readJson(HISTORY),
])

const row = { date: new Date().toISOString().slice(0, 10) }
const set = (key, value) => { if (Number.isFinite(value) && value > 0) row[key] = value }

set('youtubeViews', yt?.channel?.viewCount)
set('youtubeSubscribers', yt?.channel?.subscriberCount)
set('tiktokFollowers', tt?.stats?.followerCount)
// Only count Instagram once it is coming from the Graph API. A stale scraper
// value repeated daily would draw a flat line that looks like stalled growth.
if (ig?.stats?.source === 'graph') {
  set('instagramFollowers', ig.stats.followerCount)
  set('instagramViews', ig.stats.totalPlays)
}

if (Object.keys(row).length === 1) {
  console.log('no usable platform numbers; history unchanged')
  process.exit(0)
}

const series = Array.isArray(existing?.series) ? [...existing.series] : []
const at = series.findIndex(s => s.date === row.date)
// Overwrite rather than append within a day: the crons run four times daily and
// a chart wants one point per day, the latest being the most complete.
if (at >= 0) series[at] = { ...series[at], ...row }
else series.push(row)
series.sort((a, b) => a.date < b.date ? -1 : 1)

await mkdir(dirname(HISTORY), { recursive: true })
await writeFile(HISTORY, JSON.stringify({
  ...existing,
  updatedAt: new Date().toISOString(),
  series,
}, null, 2) + '\n')

console.log(`history: ${series.length} days, ${series[0].date} → ${series[series.length - 1].date}`)
console.log(`  today: ${Object.entries(row).filter(([k]) => k !== 'date').map(([k, v]) => `${k}=${v.toLocaleString('en')}`).join('  ')}`)
