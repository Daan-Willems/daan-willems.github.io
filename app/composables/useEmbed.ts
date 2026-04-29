export type EmbedKind = 'youtube' | 'tiktok' | 'instagram' | 'vimeo' | 'unknown'

export interface EmbedInfo {
  kind: EmbedKind
  id: string | null
  embedUrl: string | null
  thumb: string | null
}

const RX = {
  youtube: /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  vimeo: /vimeo\.com\/(?:video\/)?(\d+)/,
  tiktok: /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
  instagram: /instagram\.com\/(?:p|reel|tv)\/([\w-]+)/,
}

export function useEmbed(url: string): EmbedInfo {
  if (!url) return { kind: 'unknown', id: null, embedUrl: null, thumb: null }

  const yt = url.match(RX.youtube)
  if (yt) {
    const id = yt[1]
    return {
      kind: 'youtube',
      id: id ?? null,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }

  const vi = url.match(RX.vimeo)
  if (vi) {
    return {
      kind: 'vimeo',
      id: vi[1] ?? null,
      embedUrl: `https://player.vimeo.com/video/${vi[1]}`,
      thumb: null,
    }
  }

  const tt = url.match(RX.tiktok)
  if (tt) {
    return {
      kind: 'tiktok',
      id: tt[1] ?? null,
      embedUrl: `https://www.tiktok.com/embed/v2/${tt[1]}`,
      thumb: null,
    }
  }

  const ig = url.match(RX.instagram)
  if (ig) {
    return {
      kind: 'instagram',
      id: ig[1] ?? null,
      embedUrl: `https://www.instagram.com/p/${ig[1]}/embed/`,
      thumb: null,
    }
  }

  return { kind: 'unknown', id: null, embedUrl: null, thumb: null }
}
