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
  }
}

async function ytVideoStats(ids) {
  if (!ids.length) return {}
  const res = await ytApi('videos', { part: 'statistics,contentDetails', id: ids.join(','), maxResults: ids.length })
  const out = {}
  for (const v of res.items || []) out[v.id] = v.statistics || {}
  return out
}

async function ytSearch(order, max) {
  const res = await ytApi('search', { part: 'snippet', channelId: YT_CHANNEL_ID, order, type: 'video', maxResults: max })
  const ids = (res.items || []).map(i => i.id.videoId).filter(Boolean)
  const stats = await ytVideoStats(ids)
  return (res.items || []).map(i => shapeYTVideo(i, stats))
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

const UA_IG_ANDROID = 'Instagram 219.0.0.12.117 Android'

async function fetchInstagram(handle) {
  if (!handle) throw new Error('IG_HANDLE missing')
  // Step 1: web_profile_info — for profile + stats + user_id
  const profileRes = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${handle}`, {
    headers: {
      'User-Agent': UA_IPHONE,
      'x-ig-app-id': '936619743392459',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': '*/*',
      'sec-fetch-site': 'same-origin',
      'sec-fetch-mode': 'cors',
      'sec-fetch-dest': 'empty',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.instagram.com/',
    },
  })
  if (!profileRes.ok) throw new Error(`Instagram profile HTTP ${profileRes.status}`)
  const profileJson = await profileRes.json()
  const u = profileJson?.data?.user
  if (!u) throw new Error('Instagram: user payload missing (login wall or rate-limited)')
  const followerCount = u.edge_followed_by?.count
  if (!followerCount) throw new Error('Instagram: followerCount missing or zero')

  // Step 2: mobile feed/user endpoint — paginated. Returns accurate play_count.
  // We fetch all posts (capped at MAX_PAGES) so we can compute totals across the full feed.
  // Each page is retried up to RETRIES times on transient failure to avoid
  // truncating the sample due to one flaky request.
  let posts = []
  let allItems = []
  try {
    const MAX_PAGES = 10
    const RETRIES = 3
    let maxId = ''
    for (let page = 0; page < MAX_PAGES; page++) {
      const url = new URL(`https://i.instagram.com/api/v1/feed/user/${u.id}/`)
      url.searchParams.set('count', '50')
      if (maxId) url.searchParams.set('max_id', maxId)
      let feedJson = null
      for (let attempt = 0; attempt < RETRIES; attempt++) {
        try {
          const feedRes = await fetch(url, {
            headers: {
              'User-Agent': UA_IG_ANDROID,
              'x-ig-app-id': '567067343352427',
              'Accept': '*/*',
              'sec-fetch-site': 'same-origin',
              'sec-fetch-mode': 'cors',
              'sec-fetch-dest': 'empty',
            },
          })
          if (!feedRes.ok) {
            if (attempt < RETRIES - 1) {
              await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
              continue
            }
            throw new Error(`HTTP ${feedRes.status}`)
          }
          feedJson = await feedRes.json()
          break
        } catch (err) {
          if (attempt === RETRIES - 1) throw err
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
        }
      }
      if (!feedJson) break
      const items = feedJson.items || []
      allItems.push(...items)
      if (!feedJson.more_available || !feedJson.next_max_id) break
      maxId = feedJson.next_max_id
    }
    if (allItems.length) {
      posts = allItems.slice(0, 6).map(item => ({
        id: item.code || item.pk,
        shortcode: item.code,
        url: `https://www.instagram.com/p/${item.code}/`,
        type: item.product_type === 'clips' ? 'reel' : (item.media_type === 2 ? 'video' : 'image'),
        publishedAt: item.taken_at ? new Date(item.taken_at * 1000).toISOString() : null,
        thumbnail: item.image_versions2?.candidates?.[0]?.url || null,
        caption: item.caption?.text || null,
        likeCount: item.like_count ?? null,
        commentCount: item.comment_count ?? null,
        viewCount: item.play_count ?? item.ig_play_count ?? item.view_count ?? null,
      }))
    }
  } catch (err) {
    console.warn(`  ! IG feed fallback: ${err.message}`)
  }
  const totalPlays = allItems.reduce((s, it) => s + (it.play_count || it.ig_play_count || 0), 0)
  const totalLikes = allItems.reduce((s, it) => s + (it.like_count || 0), 0)
  const totalComments = allItems.reduce((s, it) => s + (it.comment_count || 0), 0)

  // Coverage guard — if we sampled noticeably fewer posts than the profile claims
  // to have, the totals will be undercounted. Throw so mergeWithLastGood keeps
  // the prior values.
  const mediaCount = u.edge_owner_to_timeline_media?.count ?? 0
  if (mediaCount > 0 && allItems.length < mediaCount * 0.95) {
    throw new Error(`Instagram: incomplete pagination — sampled ${allItems.length}/${mediaCount} posts (${Math.round(allItems.length / mediaCount * 100)}%)`)
  }
  // Fallback to web_profile_info posts if feed call failed
  if (!posts.length) {
    posts = (u.edge_owner_to_timeline_media?.edges || []).slice(0, 6).map(({ node: n }) => ({
      id: n.id,
      shortcode: n.shortcode,
      url: `https://www.instagram.com/p/${n.shortcode}/`,
      type: n.is_video ? (n.product_type === 'clips' ? 'reel' : 'video') : 'image',
      publishedAt: n.taken_at_timestamp ? new Date(n.taken_at_timestamp * 1000).toISOString() : null,
      thumbnail: n.thumbnail_src || n.display_url,
      caption: n.edge_media_to_caption?.edges?.[0]?.node?.text || null,
      likeCount: n.edge_liked_by?.count ?? n.edge_media_preview_like?.count ?? null,
      commentCount: n.edge_media_to_comment?.count ?? null,
      viewCount: n.video_view_count ?? null,
    }))
  }

  return {
    handle: u.username,
    profile: {
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
      totalPlays,
      totalLikes,
      totalComments,
      sampledPostCount: allItems.length,
    },
    posts,
  }
}

// ---------------------------------------------------------------------------
// Orchestrator — fail-soft per platform, exit non-zero if any fail
// ---------------------------------------------------------------------------

async function tryFetch(label, fn) {
  const startedAt = new Date().toISOString()
  try {
    const data = await fn()
    return { status: 'ok', lastFetchedAt: startedAt, ...data }
  } catch (err) {
    console.error(`✗ ${label}:`, err.message)
    return { status: 'failed', lastFetchedAt: startedAt, error: err.message }
  }
}

async function readExisting() {
  try { return JSON.parse(await readFile(OUT_PATH, 'utf8')) } catch { return null }
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
      console.warn(`  ! ${key}: sanity-rejected (${sanityFail}) — keeping last good`)
      suspects.push({ key, reason: sanityFail })
      out[key] = { ...p, status: 'stale', lastError: `Sanity drop: ${sanityFail}`, lastErrorAt: n.lastFetchedAt }
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
  const [yt, tt, ig] = await Promise.all([
    tryFetch('YouTube', fetchYouTube),
    tryFetch('TikTok', () => fetchTikTok(process.env.TIKTOK_HANDLE)),
    tryFetch('Instagram', () => fetchInstagram(process.env.IG_HANDLE)),
  ])

  // Cache remote images locally so they don't 401/expire on the deployed site
  await cachePlatformImages(yt, tt, ig)

  const next = {
    generatedAt: new Date().toISOString(),
    youtube: yt,
    tiktok: tt,
    instagram: ig,
  }

  const prev = await readExisting()
  const { merged, suspects } = mergeWithLastGood(prev, next)

  const prevHash = prev ? JSON.stringify({ ...prev, generatedAt: undefined }) : null
  const nextHash = JSON.stringify({ ...merged, generatedAt: undefined })
  if (prevHash === nextHash) {
    console.log('socials.json unchanged — skipping write')
  } else {
    await writeFile(OUT_PATH, JSON.stringify(merged, null, 2) + '\n')
    console.log(`wrote ${OUT_PATH}`)
  }

  // Summary — show what landed in the merged file (post-sanity)
  for (const k of ['youtube', 'tiktok', 'instagram']) {
    const v = merged[k]
    const f = v?.channel?.subscriberCount ?? v?.stats?.followerCount
    if (v?.status === 'ok') {
      console.log(`  ✓ ${k}: ${f?.toLocaleString() ?? '?'} followers`)
    } else if (v?.status === 'stale') {
      console.log(`  ~ ${k}: ${f?.toLocaleString() ?? '?'} followers (stale — last error: ${v.lastError})`)
    } else {
      console.log(`  ✗ ${k}: ${v?.error || 'unknown'}`)
    }
  }

  // Fail the runner if anything went wrong — caller will see GH workflow red.
  // Page keeps showing last-good values regardless.
  const failed = [yt, tt, ig].filter(p => p.status === 'failed')
  if (failed.length || suspects.length) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
