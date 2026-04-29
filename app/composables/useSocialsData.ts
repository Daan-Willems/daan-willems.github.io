interface YouTubeVideo {
  id: string
  url: string
  title: string
  description?: string
  publishedAt?: string
  thumbnail?: string | null
  viewCount?: number | null
  likeCount?: number | null
}

interface YouTubeChannel {
  id: string
  title?: string
  description?: string
  customUrl?: string
  thumbnail?: string | null
  subscriberCount?: number | null
  videoCount?: number | null
  viewCount?: number | null
  bannerUrl?: string | null
}

interface PlatformStatus {
  status?: 'ok' | 'failed' | 'stale'
  lastFetchedAt?: string
  error?: string
  lastError?: string
  lastErrorAt?: string
}

interface TikTokData extends PlatformStatus {
  handle?: string
  profile?: {
    uniqueId: string
    nickname: string
    bio?: string | null
    bioLink?: string | null
    avatar?: string | null
    verified?: boolean
    url: string
  }
  stats?: {
    followerCount?: number
    followingCount?: number | null
    heartCount?: number | null
    videoCount?: number | null
  }
  videos?: Array<{
    id: string
    url: string
    description?: string
    publishedAt?: string | null
    thumbnail?: string | null
    duration?: number | null
    viewCount?: number | null
    likeCount?: number | null
    commentCount?: number | null
  }>
}

interface InstagramData extends PlatformStatus {
  handle?: string
  profile?: {
    username: string
    fullName: string
    bio?: string | null
    bioLinks?: Array<{ title: string; url: string }>
    externalUrl?: string | null
    avatar?: string
    isBusiness?: boolean
    category?: string | null
    verified?: boolean
    url: string
  }
  stats?: {
    followerCount?: number
    followingCount?: number | null
    mediaCount?: number | null
    totalPlays?: number | null
    totalLikes?: number | null
    totalComments?: number | null
    sampledPostCount?: number | null
  }
  posts?: Array<{
    id: string
    shortcode: string
    url: string
    type: 'reel' | 'video' | 'image'
    publishedAt?: string | null
    thumbnail?: string | null
    caption?: string | null
    likeCount?: number | null
    commentCount?: number | null
    viewCount?: number | null
  }>
}

interface YouTubeData extends PlatformStatus {
  channel?: YouTubeChannel | null
  latest?: YouTubeVideo[]
  top?: YouTubeVideo[]
}

interface SocialsData {
  generatedAt?: string | null
  youtube?: YouTubeData
  tiktok?: TikTokData
  instagram?: InstagramData
}

const STATE_KEY = 'socialsData'

export function useSocialsData() {
  const state = useState<SocialsData | null>(STATE_KEY, () => null)
  const error = useState<string | null>(`${STATE_KEY}:error`, () => null)
  const loading = useState<boolean>(`${STATE_KEY}:loading`, () => false)

  async function load(force = false) {
    if (import.meta.server) return null
    if (state.value && !force) return state.value
    loading.value = true
    error.value = null
    try {
      const url = `/data/socials.json?v=${Date.now()}`
      const res = await $fetch<SocialsData>(url)
      state.value = res
      return res
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  return { socials: state, error, loading, load }
}
