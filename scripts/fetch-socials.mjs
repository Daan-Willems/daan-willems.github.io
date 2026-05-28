#!/usr/bin/env node
import { writeFile, readFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT_PATH = resolve(ROOT, 'public/data/socials.json')
const CACHE_DIR = resolve(ROOT, 'public/images/socials')
const CACHE_PUBLIC = '/images/socials'

async function cacheImage(url, subdir, filename, headers = {}) {
  if (!url) return null
  if (url.startsWith('/')) return url
  try {
    const dir = resolve(CACHE_DIR, subdir)
    await mkdir(dir, { recursive: true })
    const target = resolve(dir, filename)
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    await writeFile(target, buf)
    return `${CACHE_PUBLIC}/${subdir}/${filename}`
  } catch (err) {
    console.warn(`  ! cache image failed (${url.slice(0, 60)}…): ${err.message}`)
    return null
  }
}

async function pruneCacheDir(subdir, keepFiles) {
  try {
    const dir = resolve(CACHE_DIR, subdir)
    const existing = await readdir(dir)
    const keep = new Set(keepFiles)
    for (const f of existing) {
      if (!keep.has(f)) await unlink(resolve(dir, f))
    }
  } catch {}
}

const UA_DESKTOP = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

// ---------------------------------------------------------------------------
// YouTube (official Data API)
// ---------------------------------------------------------------------------

const YT_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || 'UC0ubM_L6ISEgqr5SJfI8XTA'
const YT_API_KEY = process.env.YOUTUBE_API_KEY
const YT_LATEST_LIMIT = Number(process.env.YOUTUBE_LATEST_LIMIT || 6)
const YT_TOP_LIMIT = Number(process.env.YOUTUBE_TOP_LIMIT || 6)

async function ytApi(path, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
  url.searchParams.set('key', YT_API_KEY)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`)
  return res.json()
}

function pickThumb(t) {
  return t?.maxres?.url || t?.standard?.url || t?.high?.url || t?.medium?.url || t?.default?.url || null
}

function parseISO8601Duration(d) {
  if (!d) return null
  const m = d.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!m) return null
  return Number(m[1] || 0) * 3600 + Number(m[2] || 0) * 60 + Number(m[3] || 0)
}

function shapeYTVideo(item, statsById) {
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
    durationSec: stats.durationSec ?? null,
  }
}

async function ytVideoStats(ids) {
  if (!ids.length) return {}
  const res = await ytApi('videos', { part: 'statistics,contentDetails', id: ids.join(','), maxResults: ids.length })
  const out = {}
  for (const v of res.items || []) {
    out[v.id] = {
      ...(v.statistics || {}),
      durationSec: parseISO8601Duration(v.contentDetails?.duration),
    }
  }
  return out
}

async function ytSearch(order, max) {
  // Over-fetch so we can drop Shorts (≤60s duration) and still return `max`
  // long-form videos. search costs 100 quota units regardless of maxResults
  // up to the 50 hard cap, so widening this is effectively free.
  const fetchCount = Math.min(max * 4, 50)
  const res = await ytApi('search', { part: 'snippet', channelId: YT_CHANNEL_ID, order, type: 'video', maxResults: fetchCount })
  const ids = (res.items || []).map(i => i.id.videoId).filter(Boolean)
  const stats = await ytVideoStats(ids)
  const all = (res.items || []).map(i => shapeYTVideo(i, stats))
  const longform = all.filter(v => (v.durationSec ?? Infinity) > 60)
  return longform.slice(0, max)
}

async function fetchYouTube() {
  if (!YT_API_KEY) throw new Error('skipped (YOUTUBE_API_KEY not set)')
  const [channelRes, latest, top] = await Promise.all([
    ytApi('channels', { part: 'snippet,statistics,brandingSettings', id: YT_CHANNEL_ID }),
    ytSearch('date', YT_LATEST_LIMIT),
    ytSearch('viewCount', YT_TOP_LIMIT),
  ])
  const c = channelRes.items?.[0]
  if (!c) throw new Error('YouTube channel not found')
  const followerCount = c.statistics?.subscriberCount ? Number(c.statistics.subscriberCount) : null
  if (!followerCount) throw new Error('YouTube subscriberCount missing')
  return {
    channel: {
      id: c.id,
      title: c.snippet?.title,
      description: c.snippet?.description,
      customUrl: c.snippet?.customUrl,
      thumbnail: pickThumb(c.snippet?.thumbnails),
      subscriberCount: followerCount,
      videoCount: c.statistics?.videoCount ? Number(c.statistics.videoCount) : null,
      viewCount: c.statistics?.viewCount ? Number(c.statistics.viewCount) : null,
      bannerUrl: c.brandingSettings?.image?.bannerExternalUrl || null,
    },
    latest,
    top,
  }
}

// ---------------------------------------------------------------------------
// TikTok (public profile scrape)
// ---------------------------------------------------------------------------

async function fetchTikTok(handle) {
  if (!handle) throw new Error('TIKTOK_HANDLE missing')
  const res = await fetch(`https://www.tiktok.com/@${handle}`, {
    headers: { 'User-Agent': UA_DESKTOP, 'Accept-Language': 'en-US,en;q=0.9' },
  })
  if (!res.ok) throw new Error(`TikTok HTTP ${res.status}`)
  const html = await res.text()
  const m = html.match(/<script[^>]*id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([^<]+)<\/script>/)
  if (!m) throw new Error('TikTok: data blob not found (format may have changed)')
  const data = JSON.parse(m[1])
  const scope = data?.__DEFAULT_SCOPE__ || {}
  const u = scope['webapp.user-detail']?.userInfo
  const followerCount = u?.stats?.followerCount
  if (!followerCount) throw new Error('TikTok: followerCount missing or zero')

  // Try to extract recent video list — present at scope['webapp.video-detail'] or in user-post lists
  const videoListSrc =
    scope['webapp.user-post']?.itemList ||
    scope['webapp.video-detail']?.itemList ||
    u?.itemList ||
    []
  const videos = (Array.isArray(videoListSrc) ? videoListSrc : []).slice(0, 6).map(v => ({
    id: v.id,
    url: `https://www.tiktok.com/@${u.user?.uniqueId}/video/${v.id}`,
    description: v.desc,
    publishedAt: v.createTime ? new Date(v.createTime * 1000).toISOString() : null,
    thumbnail: v.video?.cover || v.video?.dynamicCover || v.video?.originCover || null,
    duration: v.video?.duration ?? null,
    viewCount: v.stats?.playCount ?? null,
    likeCount: v.stats?.diggCount ?? null,
    commentCount: v.stats?.commentCount ?? null,
    shareCount: v.stats?.shareCount ?? null,
  }))

  return {
    handle: u.user?.uniqueId,
    profile: {
      uniqueId: u.user?.uniqueId,
      nickname: u.user?.nickname,
      bio: u.user?.signature || null,
      bioLink: u.user?.bioLink?.link || null,
      avatar: u.user?.avatarLarger || u.user?.avatarMedium || u.user?.avatarThumb || null,
      verified: !!u.user?.verified,
      url: `https://www.tiktok.com/@${u.user?.uniqueId}`,
    },
    stats: {
      followerCount,
      followingCount: u.stats?.followingCount ?? null,
      heartCount: u.stats?.heartCount ?? u.stats?.heart ?? null,
      videoCount: u.stats?.videoCount ?? null,
    },
    videos,
  }
}

// ---------------------------------------------------------------------------
// Instagram (public web profile API, no auth)
// ---------------------------------------------------------------------------

// Both profile and feed/user calls present as the *same* iPhone-Safari client
// on instagram.com. Mixing fingerprints between calls (web → Android-app)
// from one IP within seconds was the burst pattern triggering 401/429.
const IG_HEADERS = {
  'User-Agent': UA_IPHONE,
  'x-ig-app-id': '936619743392459',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'X-Requested-With': 'XMLHttpRequest',
  'Referer': 'https://www.instagram.com/',
}

async function igFetch(url, label) {
  const t0 = Date.now()
  const res = await fetch(url, { headers: IG_HEADERS })
  const dt = Date.now() - t0
  const retryAfter = res.headers.get('retry-after')
  const xrlRemaining = res.headers.get('x-ratelimit-remaining')
  const xrlReset = res.headers.get('x-ratelimit-reset')
  const tag = `[ig] ${label}`
  const ext = [
    retryAfter && `retry-after=${retryAfter}`,
    xrlRemaining && `rl-rem=${xrlRemaining}`,
    xrlReset && `rl-reset=${xrlReset}`,
  ].filter(Boolean).join(' ')
  console.log(`  ${tag}: ${res.status} (${dt}ms)${ext ? ' ' + ext : ''}`)
  return { res, retryAfter: retryAfter ? Number(retryAfter) : null }
}

async function fetchInstagramProfile(handle) {
  // web_profile_info — full profile + counts + user_id. CI runners typically
  // get an instant 429 on this endpoint; retries don't help (penalty box
  // doesn't drain in seconds). Single attempt; orchestrator falls back to
  // cached profile from prevState.
  const { res, retryAfter } = await igFetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`,
    `profile`,
  )
  if (res.ok) return await res.json()
  const err = new Error(`Instagram profile HTTP ${res.status}${retryAfter ? ` retry-after=${retryAfter}s` : ''}`)
  err.status = res.status
  throw err
}

async function fetchInstagram(handle, prevState) {
  if (!handle) throw new Error('IG_HANDLE missing')

  // The profile endpoint (web_profile_info) almost always 429s on CI runners
  // and retries don't drain the penalty box. Throttle attempts to once per
  // IG_PROFILE_CACHE_HOURS (default 12) using prev.lastProfileFetchAt — the
  // cached profile shape is fine for the feed path either way, only counts
  // (followers, mediaCount, avatar) go slightly stale, and they move slowly.
  const synthesizeUserFromPrev = () => {
    const prevUserId = prevState?.profile?.userId
    const prevFollowerCount = prevState?.stats?.followerCount
    if (!prevUserId || !prevFollowerCount) return null
    return {
      id: prevUserId,
      username: prevState.profile.username,
      full_name: prevState.profile.fullName,
      biography: prevState.profile.bio,
      bio_links: (prevState.profile.bioLinks || []).map(l => ({ title: l.title, url: l.url })),
      external_url: prevState.profile.externalUrl,
      profile_pic_url_hd: prevState.profile.avatar,
      profile_pic_url: prevState.profile.avatar,
      is_business_account: prevState.profile.isBusiness,
      category_name: prevState.profile.category,
      is_verified: prevState.profile.verified,
      edge_followed_by: { count: prevFollowerCount },
      edge_follow: { count: prevState.stats.followingCount ?? null },
      edge_owner_to_timeline_media: {
        count: prevState.stats.mediaCount ?? null,
        edges: [],
      },
    }
  }

  const PROFILE_CACHE_HOURS = Number(process.env.IG_PROFILE_CACHE_HOURS || 12)
  const prevProfileAttemptAge = prevState?.lastProfileFetchAt
    ? Date.now() - Date.parse(prevState.lastProfileFetchAt)
    : Infinity
  const skipProfile =
    prevProfileAttemptAge < PROFILE_CACHE_HOURS * 3600 * 1000 &&
    !!prevState?.profile?.userId

  let u = null
  let profileSourcedFromPrev = false
  let lastProfileFetchAt = prevState?.lastProfileFetchAt || null

  if (skipProfile) {
    const cached = synthesizeUserFromPrev()
    if (cached) {
      u = cached
      profileSourcedFromPrev = true
      console.log(`  [ig] skipping profile call — last attempted ${(prevProfileAttemptAge / 3600000).toFixed(1)}h ago (throttle ${PROFILE_CACHE_HOURS}h)`)
    }
  }

  if (!u) {
    // Set the timestamp before the call so even a 429 counts as an attempt and
    // the throttle holds — otherwise we'd keep retrying every run.
    lastProfileFetchAt = new Date().toISOString()
    try {
      const profileJson = await fetchInstagramProfile(handle)
      u = profileJson?.data?.user
      if (!u) throw new Error('Instagram: user payload missing (login wall or rate-limited)')
      if (!u.edge_followed_by?.count) throw new Error('Instagram: followerCount missing or zero')
    } catch (err) {
      const cached = synthesizeUserFromPrev()
      if (!cached) throw err
      profileSourcedFromPrev = true
      console.warn(`  ! IG profile endpoint failed (${err.message}); reusing cached profile (userId=${cached.id}) and updating feed-only`)
      u = cached
    }
  }

  const followerCount = u.edge_followed_by?.count

  // Step 2: paginated feed iterator (cross-run state machine).
  //
  // CI runners get a per-IP budget of ~4 successful feed calls per session
  // before IG starts 401-ing — pacing the calls doesn't help, the cap is by
  // count, not time. To fetch all ~91 items, we persist the pagination
  // cursor + accumulated items in socials.json and resume across cron runs.
  // After the cycle completes, we reuse cached items for CYCLE_VALID hours
  // before starting a new pass.
  const PAGES_PER_RUN = Number(process.env.IG_PAGES_PER_RUN || 4)
  const CYCLE_VALID_MS = Number(process.env.IG_CYCLE_VALID_HOURS || 36) * 60 * 60 * 1000
  const RETRIES = 3
  const PAGE_DELAY_BASE_MS = 18000
  const PAGE_DELAY_JITTER_MS = 4000
  const RETRY_BACKOFF_MS = [10000, 20000]

  const prevCycle = prevState?.iterator || null
  const cycleAge = prevCycle?.completedAt ? Date.now() - Date.parse(prevCycle.completedAt) : Infinity
  const cycleStillFresh = !!prevCycle?.completedAt && cycleAge < CYCLE_VALID_MS

  let cycle
  if (cycleStillFresh) {
    cycle = { ...prevCycle, items: { ...prevCycle.items } }
    console.log(`  [ig] cycle complete + ${(cycleAge / 3600000).toFixed(1)}h old < ${(CYCLE_VALID_MS / 3600000).toFixed(0)}h validity; skipping pagination`)
  } else if (prevCycle && !prevCycle.completedAt && prevCycle.cursor) {
    cycle = { ...prevCycle, items: { ...prevCycle.items } }
    console.log(`  [ig] resuming cycle from cursor=${cycle.cursor}, items so far: ${Object.keys(cycle.items).length}`)
  } else {
    cycle = { startedAt: new Date().toISOString(), cursor: null, completedAt: null, items: {} }
    console.log(`  [ig] starting new iterator cycle`)
  }

  const itemsBefore = Object.keys(cycle.items).length
  let cycleJustCompleted = false
  if (!cycleStillFresh) {
    let maxId = cycle.cursor || ''
    let exhausted = false
    for (let page = 0; page < PAGES_PER_RUN; page++) {
      const delay = PAGE_DELAY_BASE_MS + Math.floor(Math.random() * PAGE_DELAY_JITTER_MS)
      console.log(`  [ig] feed page=${page} sleeping ${delay}ms before fetch`)
      await new Promise(r => setTimeout(r, delay))

      const url = new URL(`https://i.instagram.com/api/v1/feed/user/${u.id}/`)
      url.searchParams.set('count', '50')
      if (maxId) url.searchParams.set('max_id', maxId)

      let feedJson = null
      for (let attempt = 0; attempt < RETRIES; attempt++) {
        const { res, retryAfter } = await igFetch(url, `feed page=${page} attempt=${attempt}`)
        if (res.ok) { feedJson = await res.json(); break }
        if (attempt < RETRIES - 1) {
          const wait = (res.status === 429 && retryAfter) ? retryAfter * 1000 : RETRY_BACKOFF_MS[attempt]
          console.warn(`  [ig] feed page=${page} ${res.status} — waiting ${wait}ms before retry`)
          await new Promise(r => setTimeout(r, wait))
        }
      }

      if (!feedJson) {
        console.warn(`  [ig] feed page=${page} failed after retries — saving partial progress, will resume next run`)
        break
      }

      const items = feedJson.items || []
      for (const it of items) {
        const pk = String(it.pk)
        cycle.items[pk] = {
          pk,
          code: it.code,
          takenAt: it.taken_at,
          mediaType: it.media_type ?? null,
          productType: it.product_type ?? null,
          likeCount: it.like_count ?? null,
          commentCount: it.comment_count ?? null,
          playCount: it.play_count ?? it.ig_play_count ?? it.view_count ?? null,
          thumbnail: it.image_versions2?.candidates?.[0]?.url || null,
          caption: it.caption?.text || null,
        }
      }
      console.log(`  [ig] feed page=${page} got=${items.length} cycleItems=${Object.keys(cycle.items).length} more=${!!feedJson.more_available}`)

      if (items.length === 0) {
        // IG sometimes returns 200 with more_available:true but an empty items
        // list once we've paged past the indexable tail. Treat as exhaustion
        // so we stop burning per-IP feed-call budget on a dead cursor.
        console.log(`  [ig] feed page=${page} returned 0 items — treating as exhausted`)
        exhausted = true
        break
      }
      if (!feedJson.more_available || !feedJson.next_max_id) { exhausted = true; break }
      maxId = feedJson.next_max_id
    }

    cycle.cursor = exhausted ? null : (maxId || null)
    cycle.lastFetchedAt = new Date().toISOString()
    if (exhausted) {
      cycle.completedAt = new Date().toISOString()
      cycleJustCompleted = true
      console.log(`  [ig] cycle complete — ${Object.keys(cycle.items).length} items`)
    }
  }

  const itemValues = Object.values(cycle.items)
  const expectedCount = u.edge_owner_to_timeline_media?.count ?? 0
  // 0.85 (not 0.95) because IG's user-feed endpoint tops out below media_count
  // — old reels, archived items, and pagination drop-off mean we observe ~92%
  // of media_count as the natural ceiling. 85% gives headroom without letting
  // an actually-broken partial parse through.
  const itemsHealthy = !!cycle.completedAt || (expectedCount > 0 && itemValues.length >= expectedCount * 0.85)

  const totalPlays = itemValues.reduce((s, it) => s + (it.playCount || 0), 0)
  const totalLikes = itemValues.reduce((s, it) => s + (it.likeCount || 0), 0)
  const totalComments = itemValues.reduce((s, it) => s + (it.commentCount || 0), 0)

  const sortedItems = itemValues.slice().sort((a, b) => (b.takenAt || 0) - (a.takenAt || 0))
  let posts = sortedItems.slice(0, 6).map(item => ({
    id: item.code || item.pk,
    shortcode: item.code,
    url: `https://www.instagram.com/p/${item.code}/`,
    type: item.productType === 'clips' ? 'reel' : (item.mediaType === 2 ? 'video' : 'image'),
    publishedAt: item.takenAt ? new Date(item.takenAt * 1000).toISOString() : null,
    thumbnail: item.thumbnail,
    caption: item.caption,
    likeCount: item.likeCount,
    commentCount: item.commentCount,
    viewCount: item.playCount,
  }))

  if (!posts.length && prevState?.posts?.length) posts = prevState.posts

  let outTotalPlays = totalPlays
  let outTotalLikes = totalLikes
  let outTotalComments = totalComments
  let outFeedSourcedFromPrev = false
  if (!itemsHealthy && prevState?.stats) {
    outTotalPlays = prevState.stats.totalPlays ?? totalPlays
    outTotalLikes = prevState.stats.totalLikes ?? totalLikes
    outTotalComments = prevState.stats.totalComments ?? totalComments
    outFeedSourcedFromPrev = true
    console.log(`  [ig] cycle in progress (${itemValues.length}/${expectedCount} items); reusing prev totals`)
  }

  // lastSuccessAt advances on any sign of forward progress this run — not just
  // cycle completion. The cycle iterator can stay open for days when IG's
  // rate-limit/cursor-validity gods are against us; if we still made *some*
  // progress (got new items, or got a fresh profile call through), the data
  // is fresh enough to count as success for staleness purposes.
  const itemsGrewThisRun = itemValues.length > itemsBefore
  const profileFreshThisRun = !profileSourcedFromPrev
  const madeForwardProgress = cycleJustCompleted || profileFreshThisRun || itemsGrewThisRun
  const successTimestamp = cycleJustCompleted
    ? cycle.completedAt
    : madeForwardProgress
      ? new Date().toISOString()
      : (prevState?.lastSuccessAt || null)

  return {
    handle: u.username,
    lastSuccessAt: successTimestamp,
    lastProfileFetchAt,
    profile: {
      userId: String(u.id),
      username: u.username,
      fullName: u.full_name,
      bio: u.biography || null,
      bioLinks: (u.bio_links || []).map(l => ({ title: l.title, url: l.url })),
      externalUrl: u.external_url || null,
      avatar: u.profile_pic_url_hd || u.profile_pic_url,
      isBusiness: !!u.is_business_account,
      category: u.category_name || null,
      verified: !!u.is_verified,
      url: `https://www.instagram.com/${u.username}/`,
    },
    stats: {
      followerCount,
      followingCount: u.edge_follow?.count ?? null,
      mediaCount: u.edge_owner_to_timeline_media?.count ?? null,
      totalPlays: outTotalPlays,
      totalLikes: outTotalLikes,
      totalComments: outTotalComments,
      sampledPostCount: itemValues.length,
      profileSourcedFromPrev,
      feedSourcedFromPrev: outFeedSourcedFromPrev,
      iteratorCycleComplete: !!cycle.completedAt,
    },
    posts,
    iterator: {
      startedAt: cycle.startedAt,
      lastFetchedAt: cycle.lastFetchedAt || cycle.startedAt,
      completedAt: cycle.completedAt || null,
      cursor: cycle.cursor || null,
      items: cycle.items,
    },
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — fail-soft per platform, exit non-zero if any fail
// ---------------------------------------------------------------------------

async function tryFetch(label, fn, prev) {
  const startedAt = new Date().toISOString()
  try {
    const data = await fn()
    const out = { status: 'ok', lastFetchedAt: startedAt, ...data }
    // Default lastSuccessAt = now for platforms that don't set it explicitly
    // (YT/TT). IG sets it explicitly: only when an iterator cycle completes
    // this run, otherwise inherits prev.
    if (out.lastSuccessAt == null) out.lastSuccessAt = startedAt
    return out
  } catch (err) {
    console.error(`✗ ${label}:`, err.message)
    return {
      status: 'failed',
      lastFetchedAt: startedAt,
      lastSuccessAt: prev?.lastSuccessAt || null,
      error: err.message,
    }
  }
}

async function readExisting() {
  try {
    const data = JSON.parse(await readFile(OUT_PATH, 'utf8'))
    // Migration: backfill lastSuccessAt from lastFetchedAt for platforms that
    // were ok before this field existed, so we don't trip the staleness alert
    // on the first run after deploy.
    for (const k of ['youtube', 'tiktok', 'instagram']) {
      const v = data[k]
      if (v && !v.lastSuccessAt && v.status === 'ok' && v.lastFetchedAt) {
        v.lastSuccessAt = v.lastFetchedAt
      }
    }
    return data
  } catch { return null }
}

function parsePlatforms() {
  const args = process.argv.slice(2)
  const all = ['youtube', 'tiktok', 'instagram']
  const idx = args.indexOf('--platform')
  if (idx === -1) return all
  const list = (args[idx + 1] || '').split(',').map(s => s.trim()).filter(Boolean)
  for (const p of list) if (!all.includes(p)) throw new Error(`unknown platform: ${p}`)
  return list.length ? list : all
}

const STALE_THRESHOLD_MS = {
  youtube: Number(process.env.YT_STALE_HOURS || 24) * 3600 * 1000,
  tiktok: Number(process.env.TT_STALE_HOURS || 24) * 3600 * 1000,
  instagram: Number(process.env.IG_STALE_HOURS || 36) * 3600 * 1000,
}

// Per-metric sanity floors. Cumulative metrics (lifetime views, total plays/likes)
// only ever grow; a drop almost always means a partial parse / pagination glitch.
// Use a tight 0.97 floor for those. Followers/counts can dip slightly day-to-day
// so allow more headroom there.
const KEY_METRICS = {
  youtube: [
    { path: 'channel.subscriberCount', floor: 0.9 },
    { path: 'channel.viewCount', floor: 0.97 },
    { path: 'channel.videoCount', floor: 0.85 },
  ],
  tiktok: [
    { path: 'stats.followerCount', floor: 0.9 },
    { path: 'stats.heartCount', floor: 0.97 },
    { path: 'stats.videoCount', floor: 0.85 },
  ],
  instagram: [
    { path: 'stats.followerCount', floor: 0.9 },
    { path: 'stats.totalPlays', floor: 0.97 },
    { path: 'stats.totalLikes', floor: 0.97 },
    { path: 'stats.mediaCount', floor: 0.85 },
  ],
}

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj)
}

function sanityCheck(prev, next, platform) {
  if (!prev || prev.status === 'failed' || !next || next.status !== 'ok') return null
  for (const { path, floor } of KEY_METRICS[platform]) {
    const prevVal = getPath(prev, path)
    const nextVal = getPath(next, path)
    if (typeof prevVal === 'number' && prevVal > 0 && typeof nextVal === 'number') {
      if (nextVal < prevVal * floor) {
        return `${path}: ${nextVal.toLocaleString()} < ${(prevVal * floor).toFixed(0).toLocaleString()} (was ${prevVal.toLocaleString()}, floor ${(floor * 100).toFixed(0)}%)`
      }
    }
  }
  return null
}

function mergeWithLastGood(prev, next) {
  // Three protections:
  //   1. New fetch failed → keep prior data, mark stale
  //   2. New fetch parsed OK but a key metric dropped >30% → suspect partial parse, keep prior, mark stale
  //   3. Otherwise use the new data
  const out = { ...next }
  const suspects = []
  for (const key of ['youtube', 'tiktok', 'instagram']) {
    const n = next[key]
    const p = prev?.[key]
    if (n?.status === 'failed' && p && p.status !== 'failed') {
      out[key] = { ...p, status: 'stale', lastError: n.error, lastErrorAt: n.lastFetchedAt }
      continue
    }
    const sanityFail = sanityCheck(p, n, key)
    if (sanityFail) {
      // Preserve prev.stats so the displayed numbers never drop due to
      // sampling noise (an incomplete iterator cycle samples different items
      // run-to-run, totals jitter). Everything else from this run wins:
      // iterator progress, posts list, profile, lastSuccessAt — so we don't
      // lose paginated work and the staleness signal reflects reality.
      console.warn(`  ! ${key}: sanity-rejected (${sanityFail}) — preserving prev stats, advancing iterator + lastSuccessAt`)
      suspects.push({ key, reason: sanityFail })
      out[key] = {
        ...n,
        status: 'stale',
        lastError: `Sanity drop: ${sanityFail}`,
        lastErrorAt: n.lastFetchedAt,
        stats: p.stats || n.stats,
      }
    }
  }
  return { merged: out, suspects }
}

async function cachePlatformImages(yt, tt, ig) {
  const igHeaders = { 'User-Agent': UA_IPHONE, 'Referer': 'https://www.instagram.com/' }
  const ttHeaders = { 'User-Agent': UA_DESKTOP, 'Referer': 'https://www.tiktok.com/' }

  // Avatars (one per platform, stable filenames)
  if (yt.status === 'ok' && yt.channel?.thumbnail) {
    const local = await cacheImage(yt.channel.thumbnail, 'avatars', 'youtube.jpg')
    if (local) yt.channel.thumbnail = local
  }
  if (tt.status === 'ok' && tt.profile?.avatar) {
    const local = await cacheImage(tt.profile.avatar, 'avatars', 'tiktok.jpg', ttHeaders)
    if (local) tt.profile.avatar = local
  }
  if (ig.status === 'ok' && ig.profile?.avatar) {
    const local = await cacheImage(ig.profile.avatar, 'avatars', 'instagram.jpg', igHeaders)
    if (local) ig.profile.avatar = local
  }

  // IG post thumbnails (cached by shortcode, prune old)
  if (ig.status === 'ok' && Array.isArray(ig.posts)) {
    const keep = []
    for (const post of ig.posts) {
      if (!post.thumbnail) continue
      const filename = `${post.shortcode}.jpg`
      const local = await cacheImage(post.thumbnail, 'ig-posts', filename, igHeaders)
      if (local) {
        post.thumbnail = local
        keep.push(filename)
      }
    }
    await pruneCacheDir('ig-posts', keep)
  }

  // TikTok video covers (if any were scraped)
  if (tt.status === 'ok' && Array.isArray(tt.videos)) {
    const keep = []
    for (const v of tt.videos) {
      if (!v.thumbnail) continue
      const filename = `${v.id}.jpg`
      const local = await cacheImage(v.thumbnail, 'tt-videos', filename, ttHeaders)
      if (local) {
        v.thumbnail = local
        keep.push(filename)
      }
    }
    await pruneCacheDir('tt-videos', keep)
  }
}

async function main() {
  const platforms = parsePlatforms()
  console.log(`platforms this run: ${platforms.join(', ')}`)

  const prev = await readExisting()

  const fetchers = {
    youtube: () => tryFetch('YouTube', fetchYouTube, prev?.youtube),
    tiktok: () => tryFetch('TikTok', () => fetchTikTok(process.env.TIKTOK_HANDLE), prev?.tiktok),
    instagram: () => tryFetch('Instagram', () => fetchInstagram(process.env.IG_HANDLE, prev?.instagram), prev?.instagram),
  }

  const results = await Promise.all(platforms.map(p => fetchers[p]()))
  const fetched = Object.fromEntries(platforms.map((p, i) => [p, results[i]]))

  // Carry forward unfetched platforms from prev so the merged file stays whole
  const yt = fetched.youtube || prev?.youtube || { status: 'failed', error: 'never fetched', lastSuccessAt: null }
  const tt = fetched.tiktok || prev?.tiktok || { status: 'failed', error: 'never fetched', lastSuccessAt: null }
  const ig = fetched.instagram || prev?.instagram || { status: 'failed', error: 'never fetched', lastSuccessAt: null }

  // Cache remote images locally so they don't 401/expire on the deployed
  // site. cacheImage is a no-op for URLs that are already local paths, so
  // calling this on prev-carried platforms is cheap.
  await cachePlatformImages(yt, tt, ig)

  const next = {
    generatedAt: new Date().toISOString(),
    youtube: yt,
    tiktok: tt,
    instagram: ig,
  }

  const { merged } = mergeWithLastGood(prev, next)

  // Hash-compare to skip writes when nothing meaningful changed. Strip
  // lastFetchedAt timestamps so a no-progress run (e.g. IG hit a 401 and
  // didn't advance the cursor) doesn't generate an empty git commit.
  const meaningful = (obj) => {
    if (!obj) return null
    const { generatedAt, ...rest } = obj
    const out = { ...rest }
    for (const k of ['youtube', 'tiktok', 'instagram']) {
      if (!out[k]) continue
      const { lastFetchedAt, ...platformRest } = out[k]
      out[k] = platformRest
      if (out[k].iterator) {
        const { lastFetchedAt: _, ...iterRest } = out[k].iterator
        out[k].iterator = iterRest
      }
    }
    return JSON.stringify(out)
  }
  if (meaningful(prev) === meaningful(merged)) {
    console.log('socials.json unchanged — skipping write')
  } else {
    await writeFile(OUT_PATH, JSON.stringify(merged, null, 2) + '\n')
    console.log(`wrote ${OUT_PATH}`)
  }

  // Per-platform freshness summary + staleness check
  const stale = []
  const now = Date.now()
  for (const k of ['youtube', 'tiktok', 'instagram']) {
    const v = merged[k]
    const f = v?.channel?.subscriberCount ?? v?.stats?.followerCount
    const successAt = v?.lastSuccessAt
    const ageMs = successAt ? now - Date.parse(successAt) : Infinity
    const ageHrs = Number.isFinite(ageMs) ? (ageMs / 3600000).toFixed(1) : '?'
    const thresholdHrs = (STALE_THRESHOLD_MS[k] / 3600000).toFixed(0)
    const isStale = ageMs > STALE_THRESHOLD_MS[k]
    const sigil = isStale ? '✗' : (v?.status === 'ok' ? '✓' : '~')
    const note = []
    if (k === 'instagram' && v?.iterator && !v.iterator.completedAt) {
      const itemCount = Object.keys(v.iterator.items || {}).length
      const expected = v.stats?.mediaCount
      note.push(`cycle in progress (${itemCount}${expected ? '/' + expected : ''})`)
    }
    if (v?.status === 'stale') note.push(`fetch failed: ${v.lastError}`)
    if (isStale) note.push(`PAST STALENESS THRESHOLD`)
    console.log(`  ${sigil} ${k}: ${f?.toLocaleString() ?? '?'} followers — last fresh ${ageHrs}h ago (threshold ${thresholdHrs}h)${note.length ? ' — ' + note.join('; ') : ''}`)
    if (isStale && platforms.includes(k)) stale.push(k)
  }

  // Exit non-zero ONLY when a platform processed in *this* run is past its
  // staleness threshold. Other platforms' staleness is logged for visibility
  // but doesn't fail this workflow — each platform has its own cron job that
  // owns its freshness.
  if (stale.length) {
    console.error(`stale platforms past threshold: ${stale.join(', ')}`)
    process.exit(1)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
