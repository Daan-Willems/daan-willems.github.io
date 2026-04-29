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

interface SocialsData {
  generatedAt?: string | null
  youtube?: {
    channel?: YouTubeChannel | null
    latest?: YouTubeVideo[]
    top?: YouTubeVideo[]
  }
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
