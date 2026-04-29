interface RuntimeContent {
  stats?: Array<{ value: number; suffix?: string; prefix?: string; label: Record<string, string> }>
  services?: Array<{
    id: string
    icon?: string
    title: Record<string, string>
    blurb: Record<string, string>
    fromPrice?: number
    currency?: string
    deliverables?: Record<string, string[]>
  }>
  collabs?: Array<{
    brand: string
    year?: number
    kind?: Record<string, string>
    summary?: Record<string, string>
    description?: Record<string, string>
    business?: {
      what?: Record<string, string>
      location?: string
      website?: string
    }
    image?: string
    href?: string
  }>
  testimonials?: Array<{
    quote: Record<string, string>
    author?: string
    role?: Record<string, string>
  }>
  socials?: {
    youtube?: { channelId?: string; apiKey?: string; curatedUrls?: string[] }
    tiktok?: { handle?: string; curatedUrls?: string[] }
    instagram?: { handle?: string; curatedUrls?: string[] }
  }
  contact?: {
    phone?: string
    whatsapp?: string
    email?: string
    channels?: Array<{
      id: string
      icon?: string
      email?: string
      title: Record<string, string>
      intro?: Record<string, string>
      mailSubject?: Record<string, string>
      mailBody?: Record<string, string>
      waMessage?: Record<string, string>
    }>
    mailSubject?: Record<string, string>
    mailBody?: Record<string, string>
  }
}

const STATE_KEY = 'runtimeContent'

export function useRuntimeContent() {
  const state = useState<RuntimeContent | null>(STATE_KEY, () => null)
  const error = useState<string | null>(`${STATE_KEY}:error`, () => null)
  const loading = useState<boolean>(`${STATE_KEY}:loading`, () => false)

  async function load(force = false) {
    // client-only: the whole point is runtime updates without rebuild,
    // so don't bake the JSON into prerendered HTML
    if (import.meta.server) return null
    if (state.value && !force) return state.value
    loading.value = true
    error.value = null
    try {
      const url = `/data/content.json?v=${Date.now()}`
      const res = await $fetch<RuntimeContent>(url)
      state.value = res
      return res
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e)
      return null
    } finally {
      loading.value = false
    }
  }

  return { content: state, error, loading, load }
}
