#!/usr/bin/env node
// One-off: rebuild data/instagram-store.json from everything this repo has
// ever recorded about the account, then let the normal Graph runs maintain it.
//
//   node --env-file=.env scripts/seed-ig-store.mjs
//
// Why this exists: business_discovery returns 121 of the account's 151 posts.
// The missing 30 are scattered across the whole date range (not just old ones)
// and carry ~11M views, so summing only what the API hands back understates
// reach by roughly an eighth. The pre-2026-09 scraper did see them, and its
// output is still in git history -- so we reconstruct the union once here and
// accumulate from then on.

import { execSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const STORE_PATH = resolve(ROOT, 'data/instagram-store.json')
const HANDLE = process.env.IG_HANDLE || 'daanwillemsautomotive'

function historicalPosts() {
  const commits = execSync(
    'git log --format=%h --all -- public/data/socials.json data/instagram-store.json',
    { cwd: ROOT },
  ).toString().trim().split('\n').filter(Boolean)

  const out = new Map()
  for (const c of commits) {
    for (const path of ['data/instagram-store.json', 'public/data/socials.json']) {
      let json
      try {
        json = JSON.parse(execSync(`git show ${c}:${path} 2>/dev/null`, { cwd: ROOT, maxBuffer: 1 << 28 }).toString())
      } catch { continue }
      const items = json.items || json.iterator?.items || json.instagram?.iterator?.items
      if (!items) continue
      for (const [pk, v] of Object.entries(items)) {
        if (!v.code) continue
        const prev = out.get(v.code)
        // Keep the highest counts ever observed: these posts are frozen from
        // here on, so the last good scrape is the best number we will ever have.
        if (prev && (prev.viewCount || 0) >= (v.playCount || 0)) continue
        out.set(v.code, {
          shortcode: v.code,
          id: String(pk),
          timestamp: v.takenAt ? new Date(v.takenAt * 1000).toISOString() : null,
          type: v.productType === 'clips' ? 'reel' : (v.mediaType === 2 ? 'video' : 'image'),
          permalink: `https://www.instagram.com/p/${v.code}/`,
          viewCount: v.playCount ?? null,
          likeCount: v.likeCount ?? null,
          commentCount: v.commentCount ?? null,
          // play_count counted replays; view_count does not. Flagging the
          // provenance keeps the mixed-metric caveat auditable instead of
          // silently baked into one number.
          source: 'scrape',
        })
      }
    }
  }
  return out
}

const posts = historicalPosts()
console.log(`recovered ${posts.size} posts from git history`)
const dated = [...posts.values()].map(p => p.timestamp).filter(Boolean).sort()
console.log(`  range ${dated[0]?.slice(0, 10)} → ${dated[dated.length - 1]?.slice(0, 10)}`)
const plays = [...posts.values()].reduce((s, p) => s + (p.viewCount || 0), 0)
console.log(`  views ${plays.toLocaleString('en')}`)

const store = {
  handle: HANDLE,
  seededAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  posts: Object.fromEntries([...posts.entries()].sort((a, b) => (a[1].timestamp || '') < (b[1].timestamp || '') ? 1 : -1)),
}
await mkdir(dirname(STORE_PATH), { recursive: true })
await writeFile(STORE_PATH, JSON.stringify(store, null, 2) + '\n')
console.log(`wrote ${STORE_PATH}`)
