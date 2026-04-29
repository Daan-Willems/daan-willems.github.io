#!/usr/bin/env node
import { writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_PATH = resolve(ROOT, 'public/data/socials.json')

const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UC0ubM_L6ISEgqr5SJfI8XTA'
const API_KEY = process.env.YOUTUBE_API_KEY
const LATEST_LIMIT = Number(process.env.YOUTUBE_LATEST_LIMIT || 6)
const TOP_LIMIT = Number(process.env.YOUTUBE_TOP_LIMIT || 6)

if (!API_KEY) {
  console.error('YOUTUBE_API_KEY is required')
  process.exit(1)
}

async function api(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('key', API_KEY)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`)
  return res.json()
}

function pickThumb(t) {
  return t?.maxres?.url || t?.standard?.url || t?.high?.url || t?.medium?.url || t?.default?.url || null
}

function shapeVideo(item, statsById) {
  const id = item.id?.videoId || item.contentDetails?.videoId || item.id
  const s = item.snippet || {}
  const stats = statsById?.[id] || {}
  return {
    id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: s.title,
    description: s.description,
    publishedAt: s.publishedAt,
    thumbnail: pickThumb(s.thumbnails),
    viewCount: stats.viewCount ? Number(stats.viewCount) : null,
    likeCount: stats.likeCount ? Number(stats.likeCount) : null,
  }
}

async function fetchVideoStats(ids) {
  if (!ids.length) return {}
  const res = await api('videos', { part: 'statistics,contentDetails', id: ids.join(','), maxResults: ids.length })
  const out = {}
  for (const v of res.items || []) out[v.id] = v.statistics || {}
  return out
}

async function fetchLatest() {
  const res = await api('search', {
    part: 'snippet',
    channelId: CHANNEL_ID,
    order: 'date',
    type: 'video',
    maxResults: LATEST_LIMIT,
  })
  const ids = (res.items || []).map(i => i.id.videoId).filter(Boolean)
  const stats = await fetchVideoStats(ids)
  return (res.items || []).map(i => shapeVideo(i, stats))
}

async function fetchTop() {
  const res = await api('search', {
    part: 'snippet',
    channelId: CHANNEL_ID,
    order: 'viewCount',
    type: 'video',
    maxResults: TOP_LIMIT,
  })
  const ids = (res.items || []).map(i => i.id.videoId).filter(Boolean)
  const stats = await fetchVideoStats(ids)
  return (res.items || []).map(i => shapeVideo(i, stats))
}

async function fetchChannel() {
  const res = await api('channels', {
    part: 'snippet,statistics,brandingSettings',
    id: CHANNEL_ID,
  })
  const c = res.items?.[0]
  if (!c) return null
  return {
    id: c.id,
    title: c.snippet?.title,
    description: c.snippet?.description,
    customUrl: c.snippet?.customUrl,
    thumbnail: pickThumb(c.snippet?.thumbnails),
    subscriberCount: c.statistics?.subscriberCount ? Number(c.statistics.subscriberCount) : null,
    videoCount: c.statistics?.videoCount ? Number(c.statistics.videoCount) : null,
    viewCount: c.statistics?.viewCount ? Number(c.statistics.viewCount) : null,
    bannerUrl: c.brandingSettings?.image?.bannerExternalUrl || null,
  }
}

async function readExisting() {
  try { return JSON.parse(await readFile(OUT_PATH, 'utf8')) } catch { return null }
}

async function main() {
  const [channel, latest, top] = await Promise.all([fetchChannel(), fetchLatest(), fetchTop()])
  const next = {
    generatedAt: new Date().toISOString(),
    youtube: { channel, latest, top },
  }

  const prev = await readExisting()
  const prevHash = prev ? JSON.stringify({ ...prev, generatedAt: undefined }) : null
  const nextHash = JSON.stringify({ ...next, generatedAt: undefined })

  if (prevHash === nextHash) {
    console.log('socials.json unchanged — skipping write')
    return
  }

  await writeFile(OUT_PATH, JSON.stringify(next, null, 2) + '\n')
  console.log(`wrote ${OUT_PATH} (${latest.length} latest, ${top.length} top)`)
}

main().catch(err => { console.error(err); process.exit(1) })
