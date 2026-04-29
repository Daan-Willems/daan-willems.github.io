import { useI18n } from '#imports'

type LocaleMap = Record<string, string>

function isLocaleMap(v: unknown): v is LocaleMap {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && Object.values(v as object).every(x => typeof x === 'string')
    && ('nl' in (v as object) || 'en' in (v as object))
}

function resolveLocale<T>(v: T, locale: string): T | string {
  if (isLocaleMap(v)) {
    return v[locale] ?? v.nl ?? v.en ?? Object.values(v)[0] ?? ''
  }
  if (Array.isArray(v)) {
    return v.map(item => resolveLocale(item, locale)) as unknown as T
  }
  if (v && typeof v === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, val] of Object.entries(v)) {
      out[k] = resolveLocale(val, locale)
    }
    return out as unknown as T
  }
  return v
}

export function useCopy(section: string) {
  const { locale } = useI18n()
  const { data } = useAsyncData(
    `section:${section}`,
    () => queryCollection('sections').path(`/sections/${section}`).first(),
    { default: () => null },
  )

  return computed(() => {
    const doc = data.value as Record<string, unknown> | null
    if (!doc) return {} as Record<string, unknown>
    const out: Record<string, unknown> = {}
    const passthrough = new Set(['_id', '_path', '_dir', '_draft', '_partial', '_locale', 'body', 'meta', 'path', 'id', 'navigation', 'seo', 'extension', 'stem', '__hash__', 'description'])
    for (const [k, v] of Object.entries(doc)) {
      if (passthrough.has(k)) {
        out[k] = v
        continue
      }
      out[k] = resolveLocale(v, locale.value)
    }
    return out
  })
}
