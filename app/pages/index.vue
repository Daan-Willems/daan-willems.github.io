<script setup lang="ts">
import { useI18n } from '#imports'

const { locale } = useI18n()

const heroCopy = useCopy('hero')
const aboutCopy = useCopy('about')
const servicesCopy = useCopy('services')
const socialsCopy = useCopy('socials')
const collabsCopy = useCopy('collabs')
const contactCopy = useCopy('contact')
const navCopy = useCopy('nav')
const footerCopy = useCopy('footer')
const marqueeCopy = useCopy('marquee')
const testimonialsCopy = useCopy('testimonials')
const performancesCopy = useCopy('performances')

// Spotlight media — drop a file at one of these paths to swap from poster to video.
// Vertical phone-style: /videos/performance-portrait.mp4 (preferred for spotlight).
// Horizontal/landscape:  /videos/performance.mp4
const spotlightVideo = ref<string | null>(null)
const spotlightPoster = '/images/hero.webp'

const { content, load } = useRuntimeContent()
const { socials: socialsData, load: loadSocials } = useSocialsData()
onMounted(() => {
  load()
  loadSocials()
})

const stats = computed(() => {
  const t = (en: string, nl: string) => locale.value === 'en' ? en : nl
  const ytCh = socialsData.value?.youtube?.channel
  const tt = socialsData.value?.tiktok
  const ig = socialsData.value?.instagram
  const ytViews = ytCh?.viewCount ?? 0
  const ytSubs = ytCh?.subscriberCount ?? 0
  const ttLikes = tt?.stats?.heartCount ?? 0
  const ttFollowers = tt?.stats?.followerCount ?? 0
  const igFollowers = ig?.stats?.followerCount ?? 0
  const igPlays = ig?.stats?.totalPlays ?? 0
  const totalFollowers = ytSubs + ttFollowers + igFollowers
  const totalReach = ytViews + igPlays
  const collabsCount = content.value?.collabs?.length ?? 0
  return [
    {
      value: totalReach,
      label: t('Total reach', 'Totaal bekeken'),
      suffix: '+',
      detail: t(
        `${formatCompact(igPlays)} IG plays · ${formatCompact(ytViews)} YT views`,
        `${formatCompact(igPlays)} IG plays · ${formatCompact(ytViews)} YT views`,
      ),
    },
    {
      value: totalFollowers,
      label: t('Total followers', 'Volgers totaal'),
      suffix: '+',
      detail: `${formatCompact(ytSubs)} YT · ${formatCompact(ttFollowers)} TT · ${formatCompact(igFollowers)} IG`,
    },
    {
      value: ttLikes,
      label: t('TikTok likes', 'TikTok likes'),
      detail: tt?.stats
        ? `${tt.stats.videoCount ?? 0} ${t('videos', "video's")} · ${formatCompact(ttFollowers)} ${t('followers', 'volgers')}`
        : '',
    },
    {
      value: collabsCount,
      label: t('Collaborations', 'Samenwerkingen'),
      detail: t('From brand drops to live appearances', 'Van merk drops tot live optredens'),
    },
  ]
})

const services = computed(() => (content.value?.services || []).map(s => ({
  ...s,
  title: s.title?.[locale.value] || s.title?.nl || '',
  blurb: s.blurb?.[locale.value] || s.blurb?.nl || '',
  deliverables: s.deliverables?.[locale.value] || s.deliverables?.nl || [],
})))

const socialServices = computed(() => services.value.filter(s => s.id?.startsWith('social-')))
const stageServices = computed(() => services.value.filter(s => s.id === 'stage'))

function formatPrice(n?: number) {
  return n ? n.toLocaleString('nl-NL') : ''
}

// Toggle to hide all prices behind "Prijs op aanvraag" / "Price on request"
// while keeping fromPrice values intact in content.json. Flip to true to re-show.
const pricesVisible = false
const priceOnRequestLabel = computed(() => locale.value === 'en' ? 'Price on request' : 'Prijs op aanvraag')

function formatCompact(n?: number | null) {
  if (!n) return '0'
  return n.toLocaleString('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
    // @ts-ignore — supported in modern Node/browsers
    roundingMode: 'ceil',
  }).replace(/\.0/, '')
}

const collabs = computed(() => (content.value?.collabs || []).map(c => ({
  ...c,
  kind: c.kind?.[locale.value] || c.kind?.nl || '',
  summary: c.summary?.[locale.value] || c.summary?.nl || '',
  description: c.description?.[locale.value] || c.description?.nl || '',
  businessWhat: c.business?.what?.[locale.value] || c.business?.what?.nl || '',
  businessLocation: c.business?.location || '',
  businessWebsite: c.business?.website || '',
})))

const openCollab = ref<typeof collabs.value[number] | null>(null)
const isCollabOpen = computed({
  get: () => openCollab.value !== null,
  set: (v) => { if (!v) openCollab.value = null },
})
function closeCollab() { openCollab.value = null }

const testimonials = computed(() => (content.value?.testimonials || []).map(t => ({
  ...t,
  quote: t.quote?.[locale.value] || t.quote?.nl || '',
  role: t.role?.[locale.value] || t.role?.nl || '',
})))

// Aggregate bio links from across platforms (deduplicated by normalized URL)
const bioLinks = computed(() => {
  const seen = new Map<string, { url: string; label: string }>()
  const add = (u?: string | null, title?: string) => {
    if (!u) return
    const key = normalizeUrl(u)
    if (seen.has(key)) return
    seen.set(key, { url: u, label: title || prettifyUrl(u) })
  }
  add(socialsData.value?.tiktok?.profile?.bioLink)
  for (const link of socialsData.value?.instagram?.profile?.bioLinks || []) {
    add(link.url, link.title)
  }
  add(socialsData.value?.instagram?.profile?.externalUrl)
  return Array.from(seen.values())
})

function normalizeUrl(u: string) {
  try {
    const url = new URL(u)
    return (url.hostname.replace(/^www\./, '') + url.pathname.replace(/\/$/, '')).toLowerCase()
  } catch {
    return u.toLowerCase()
  }
}

function prettifyUrl(u: string) {
  try {
    const url = new URL(u)
    return (url.hostname + url.pathname).replace(/^www\./, '').replace(/\/$/, '')
  } catch {
    return u
  }
}

// Socials videos: prefer the Action-fed JSON; fall back to curated URLs in content.json
const youtubeUrls = computed(() => content.value?.socials?.youtube?.curatedUrls || [])
const ytLatest = computed(() => socialsData.value?.youtube?.latest || [])
const ytTop = computed(() => socialsData.value?.youtube?.top || [])
const ytChannel = computed(() => socialsData.value?.youtube?.channel || null)
const ttData = computed(() => socialsData.value?.tiktok || null)
const igData = computed(() => socialsData.value?.instagram || null)
const igPosts = computed(() => igData.value?.posts || [])

const platform = ref<'youtube' | 'tiktok' | 'instagram'>('youtube')
const socialsView = ref<'top' | 'latest'>('top')
const ytVisible = computed(() => socialsView.value === 'top' ? ytTop.value : ytLatest.value)

const navItems = computed(() => (navCopy.value as any).items || [])
const footerLinks = computed(() => (footerCopy.value as any).links || [])
const marqueeItems = computed(() => (marqueeCopy.value as any).items || [])

const progressSections = computed(() => [
  { id: 'top', label: locale.value === 'en' ? 'Hero' : 'Start' },
  { id: 'about', label: (aboutCopy.value as any).eyebrow || (locale.value === 'en' ? 'Story' : 'Verhaal') },
  { id: 'services', label: (servicesCopy.value as any).eyebrow || (locale.value === 'en' ? 'Services' : 'Diensten') },
  { id: 'performances', label: locale.value === 'en' ? 'Live' : 'Live' },
  { id: 'socials', label: (socialsCopy.value as any).eyebrow || 'Socials' },
  { id: 'collabs', label: (collabsCopy.value as any).eyebrow || (locale.value === 'en' ? 'Work' : 'Werk') },
  { id: 'contact', label: (contactCopy.value as any).eyebrow || 'Contact' },
])

// Lightbox state for service detail
const openService = ref<typeof services.value[number] | null>(null)
function closeService() { openService.value = null }
const isServiceOpen = computed({
  get: () => openService.value !== null,
  set: (v) => { if (!v) openService.value = null }
})

const contactRuntime = computed(() => content.value?.contact)
const phoneHref = computed(() => contactRuntime.value?.phone)
const waHref = computed(() => contactRuntime.value?.whatsapp)

const contactChannels = computed(() => (contactRuntime.value?.channels || []).map(c => ({
  id: c.id,
  icon: c.icon,
  phone: c.phone || contactRuntime.value?.phone || '',
  whatsapp: c.whatsapp || contactRuntime.value?.whatsapp || '',
  email: c.email || contactRuntime.value?.email || '',
  title: c.title?.[locale.value] || c.title?.nl || '',
  intro: c.intro?.[locale.value] || c.intro?.nl || '',
  mailSubject: c.mailSubject?.[locale.value] || c.mailSubject?.nl || '',
  mailBody: c.mailBody?.[locale.value] || c.mailBody?.nl || '',
  waMessage: c.waMessage?.[locale.value] || c.waMessage?.nl || '',
})))

const SITE_URL = 'https://daanwillems.com'
const ogImage = `${SITE_URL}/images/og.jpg`

const seoTitle = computed(() => `Daan Willems — ${(heroCopy.value as any).tagline || ''}`.trim())
const seoDescription = computed(() => {
  const intro = (heroCopy.value as any).intro || ''
  return intro
    ? intro.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200)
    : 'Daan Willems — autohandelaar met een breed publiek. Samenwerken op socials, in placement, of live op het podium.'
})

const jsonLd = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Daan Willems',
  url: SITE_URL,
  image: ogImage,
  jobTitle: locale.value === 'en' ? 'Car salesman & content creator' : 'Autoverkoper & content maker',
  description: seoDescription.value,
  worksFor: {
    '@type': 'Organization',
    name: 'Daan Willems Automotive',
    url: 'https://www.daanwillemsautomotiveshop.nl',
  },
  sameAs: [
    socialsData.value?.youtube?.channel?.customUrl ? `https://www.youtube.com/${socialsData.value.youtube.channel.customUrl}` : 'https://www.youtube.com/@daanwillemsautomotive',
    socialsData.value?.tiktok?.profile?.url || 'https://www.tiktok.com/@daanwillemsautomotive',
    socialsData.value?.instagram?.profile?.url || 'https://www.instagram.com/daanwillemsautomotive/',
  ].filter(Boolean),
}))

useHead({
  htmlAttrs: { lang: locale },
  title: () => seoTitle.value,
  meta: [
    { name: 'description', content: () => seoDescription.value },
    // OpenGraph
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: 'Daan Willems' },
    { property: 'og:title', content: () => seoTitle.value },
    { property: 'og:description', content: () => seoDescription.value },
    { property: 'og:url', content: SITE_URL },
    { property: 'og:image', content: ogImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Daan Willems — Eerlijk in beeld, breed in bereik.' },
    { property: 'og:locale', content: () => locale.value === 'en' ? 'en_US' : 'nl_NL' },
    { property: 'og:locale:alternate', content: () => locale.value === 'en' ? 'nl_NL' : 'en_US' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: () => seoTitle.value },
    { name: 'twitter:description', content: () => seoDescription.value },
    { name: 'twitter:image', content: ogImage },
  ],
  link: [
    { rel: 'canonical', href: SITE_URL },
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: () => JSON.stringify(jsonLd.value),
    },
  ],
})
</script>

<template>
  <div>
    <SectionProgress :sections="progressSections" />

    <NavBar :items="navItems" brand="Daan Willems">
      <template #brand>
        <BrandLogo variant="responsive" />
      </template>
      <template #trail>
        <LangSwitcher />
        <CtaButton variant="gold" size="md" href="#contact">
          {{ (navCopy as any).ctaLabel }}
        </CtaButton>
      </template>
    </NavBar>

    <main>
      <HeroStage bg-type="video" bg-src="/videos/hero.mp4" poster="/images/hero.webp">
        <div class="hero-inner">
          <p class="eyebrow">{{ (heroCopy as any).eyebrow }}</p>
          <h1 class="hero-title">{{ (heroCopy as any).title }}</h1>
          <p class="hero-tag">{{ (heroCopy as any).tagline }}</p>
          <p class="hero-intro">{{ (heroCopy as any).intro }}</p>
          <div class="hero-cta">
            <CtaButton variant="gold" size="lg" href="#contact">
              {{ (heroCopy as any).ctaPrimary }}
            </CtaButton>
            <CtaButton variant="ghost" size="lg" href="#socials">
              {{ (heroCopy as any).ctaSecondary }}
            </CtaButton>
          </div>
        </div>
      </HeroStage>

      <section class="marquee-band" aria-hidden="true">
        <MarqueeStrip :items="marqueeItems" :speed="55" />
      </section>

      <section class="stats">
        <div class="container">
          <RevealOnScroll>
            <StatStrip :items="stats" />
          </RevealOnScroll>
        </div>
      </section>

      <SectionBlock
        id="about"
        :eyebrow="(aboutCopy as any).eyebrow"
        :title="(aboutCopy as any).title"
        :intro="(aboutCopy as any).intro"
      />

      <SectionBlock
        id="services"
        tone="elevated"
        :eyebrow="(servicesCopy as any).eyebrow"
        :title="(servicesCopy as any).title"
        :intro="(servicesCopy as any).intro"
      >
        <div class="svc-channels">
          <RevealOnScroll>
            <div class="svc-channel">
              <div class="svc-channel__head">
                <span class="svc-channel__icon" aria-hidden="true">📱</span>
                <h3 class="svc-channel__title">{{ (servicesCopy as any).socialTitle }}</h3>
                <p class="svc-channel__intro">{{ (servicesCopy as any).socialIntro }}</p>
              </div>
              <div class="svc-channel__tiles">
                <button
                  v-for="s in socialServices"
                  :key="s.id"
                  type="button"
                  class="svc-tile"
                  @click="openService = s"
                >
                  <div class="svc-tile__head">
                    <span class="svc-tile__title">{{ s.title }}</span>
                    <span class="svc-tile__price">{{ pricesVisible ? `${s.currency}${formatPrice(s.fromPrice)}` : priceOnRequestLabel }}</span>
                  </div>
                  <p class="svc-tile__blurb">{{ s.blurb }}</p>
                  <span class="svc-tile__cta">{{ (servicesCopy as any).moreLabel }} <span aria-hidden="true">→</span></span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll :delay="80">
            <div class="svc-channel svc-channel--live">
              <span class="svc-channel__badge" aria-hidden="true">
                <span class="svc-channel__badge-dot" />
                Live
              </span>
              <div class="svc-channel__head">
                <span class="svc-channel__icon" aria-hidden="true">🎤</span>
                <h3 class="svc-channel__title">{{ (servicesCopy as any).stageTitle }}</h3>
                <p class="svc-channel__intro">{{ (servicesCopy as any).stageIntro }}</p>
              </div>
              <div class="svc-channel__tiles">
                <button
                  v-for="s in stageServices"
                  :key="s.id"
                  type="button"
                  class="svc-tile"
                  @click="openService = s"
                >
                  <div class="svc-tile__head">
                    <span class="svc-tile__title">{{ s.title }}</span>
                    <span class="svc-tile__price">{{ pricesVisible ? `${s.currency}${formatPrice(s.fromPrice)}` : priceOnRequestLabel }}</span>
                  </div>
                  <p class="svc-tile__blurb">{{ s.blurb }}</p>
                  <span class="svc-tile__cta">{{ (servicesCopy as any).moreLabel }} <span aria-hidden="true">→</span></span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </SectionBlock>

      <section id="performances" class="spotlight" data-progress-id="performances" aria-labelledby="performances-title">
        <video
          v-if="spotlightVideo"
          :key="spotlightVideo"
          class="spotlight__bg"
          :src="spotlightVideo"
          :poster="spotlightPoster"
          autoplay
          muted
          loop
          playsinline
          preload="metadata"
          aria-hidden="true"
        />
        <img
          v-else
          class="spotlight__bg"
          :src="spotlightPoster"
          alt=""
          aria-hidden="true"
        />
        <div class="spotlight__veil" aria-hidden="true" />
        <div class="spotlight__grain" aria-hidden="true" />
        <div class="spotlight__inner container">
          <RevealOnScroll>
            <div class="spotlight__head">
              <span class="spotlight__live" aria-hidden="true">
                <span class="spotlight__live-dot" />
                {{ (performancesCopy as any).eyebrow || 'Live' }}
              </span>
              <h2 id="performances-title" class="spotlight__title">{{ (performancesCopy as any).title }}</h2>
              <p class="spotlight__intro">{{ (performancesCopy as any).intro }}</p>
            </div>
          </RevealOnScroll>
          <RevealOnScroll :delay="120">
            <div class="spotlight__action">
              <div class="spotlight__price">
                <span v-if="pricesVisible" class="eyebrow">{{ (performancesCopy as any).priceLabel || 'Vanaf' }}</span>
                <span
                  class="spotlight__price-value"
                  :class="{ 'spotlight__price-value--label': !pricesVisible }"
                >{{ pricesVisible ? '€2.495' : priceOnRequestLabel }}</span>
              </div>
              <CtaButton variant="gold" size="lg" href="#contact">
                {{ (performancesCopy as any).ctaLabel || 'Boek een optreden' }}
              </CtaButton>
              <p v-if="(performancesCopy as any).ctaHint" class="spotlight__hint">{{ (performancesCopy as any).ctaHint }}</p>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      <SectionBlock
        id="socials"
        :eyebrow="(socialsCopy as any).eyebrow"
        :title="(socialsCopy as any).title"
        :intro="(socialsCopy as any).intro"
      >
        <div class="platforms">
          <a
            v-if="ytChannel"
            class="platform-card"
            :class="{ 'is-active': platform === 'youtube' }"
            :href="`https://www.youtube.com/${ytChannel.customUrl}`"
            target="_blank"
            rel="noopener"
            @click.prevent="platform = 'youtube'"
          >
            <span class="platform-card__icon" aria-hidden="true">▶</span>
            <span class="platform-card__body">
              <span class="platform-card__handle">YouTube</span>
              <span class="platform-card__sub">{{ locale === 'en' ? 'lifetime views' : 'totaal views' }}</span>
            </span>
            <span class="platform-card__count">{{ formatCompact(ytChannel.viewCount) }}</span>
          </a>
          <a
            v-if="ttData?.profile"
            class="platform-card"
            :class="{ 'is-active': platform === 'tiktok' }"
            :href="ttData.profile.url"
            target="_blank"
            rel="noopener"
            @click.prevent="platform = 'tiktok'"
          >
            <span class="platform-card__icon" aria-hidden="true">♪</span>
            <span class="platform-card__body">
              <span class="platform-card__handle">TikTok</span>
              <span class="platform-card__sub">{{ locale === 'en' ? 'total likes' : 'totaal likes' }}</span>
            </span>
            <span class="platform-card__count">{{ formatCompact(ttData.stats?.heartCount) }}</span>
          </a>
          <a
            v-if="igData?.profile"
            class="platform-card"
            :class="{ 'is-active': platform === 'instagram' }"
            :href="igData.profile.url"
            target="_blank"
            rel="noopener"
            @click.prevent="platform = 'instagram'"
          >
            <span class="platform-card__icon" aria-hidden="true">◉</span>
            <span class="platform-card__body">
              <span class="platform-card__handle">Instagram</span>
              <span class="platform-card__sub">{{ locale === 'en' ? 'total plays' : 'totaal plays' }}</span>
            </span>
            <span class="platform-card__count">{{ formatCompact(igData.stats?.totalPlays) }}</span>
          </a>
        </div>

        <div v-if="platform === 'youtube' && ytVisible.length" class="socials-toggle" role="tablist">
          <button
            type="button"
            class="socials-toggle__btn"
            :class="{ 'is-active': socialsView === 'top' }"
            @click="socialsView = 'top'"
          >{{ locale === 'en' ? 'Top videos' : 'Top video\'s' }}</button>
          <button
            type="button"
            class="socials-toggle__btn"
            :class="{ 'is-active': socialsView === 'latest' }"
            @click="socialsView = 'latest'"
          >{{ locale === 'en' ? 'Recent' : 'Recent' }}</button>
        </div>

        <RevealOnScroll>
          <!-- YouTube grid -->
          <MediaGrid
            v-if="platform === 'youtube' && ytVisible.length"
            :items="ytVisible.map(v => ({ url: v.url, title: v.title, thumb: v.thumbnail || undefined }))"
            :columns="3"
          />
          <MediaGrid
            v-else-if="platform === 'youtube' && youtubeUrls.length"
            :items="youtubeUrls.map(url => ({ url }))"
            :columns="3"
          />

          <!-- Instagram grid: thumbnails linking to instagram.com/p/<shortcode>/ -->
          <div v-else-if="platform === 'instagram' && igPosts.length" class="ig-grid">
            <a
              v-for="post in igPosts"
              :key="post.id"
              :href="post.url"
              target="_blank"
              rel="noopener"
              class="ig-post"
            >
              <img :src="post.thumbnail || ''" :alt="post.caption?.slice(0, 80) || 'Instagram post'" loading="lazy" />
              <div class="ig-post__overlay">
                <span v-if="post.viewCount" class="ig-post__stat">▶ {{ formatCompact(post.viewCount) }}</span>
                <span v-if="post.likeCount" class="ig-post__stat">♥ {{ formatCompact(post.likeCount) }}</span>
                <span v-if="post.commentCount" class="ig-post__stat">💬 {{ formatCompact(post.commentCount) }}</span>
                <span v-if="post.type === 'reel'" class="ig-post__badge">Reel</span>
              </div>
            </a>
          </div>

          <!-- TikTok: profile card with stats + CTA, no video grid (loads via JS, not in scrape) -->
          <div v-else-if="platform === 'tiktok' && ttData?.profile" class="tiktok-panel">
            <div class="tiktok-panel__head">
              <img v-if="ttData.profile.avatar" :src="ttData.profile.avatar" :alt="ttData.profile.nickname" />
              <div class="tiktok-panel__body">
                <h3 class="tiktok-panel__name">{{ ttData.profile.nickname }}</h3>
                <p v-if="ttData.profile.bio" class="tiktok-panel__bio">{{ ttData.profile.bio }}</p>
              </div>
            </div>
            <ul class="tiktok-panel__stats">
              <li>
                <span class="tiktok-panel__num">{{ formatCompact(ttData.stats?.followerCount) }}</span>
                <span class="tiktok-panel__label">{{ locale === 'en' ? 'followers' : 'volgers' }}</span>
              </li>
              <li>
                <span class="tiktok-panel__num">{{ formatCompact(ttData.stats?.heartCount) }}</span>
                <span class="tiktok-panel__label">{{ locale === 'en' ? 'likes' : 'likes' }}</span>
              </li>
              <li>
                <span class="tiktok-panel__num">{{ ttData.stats?.videoCount ?? 0 }}</span>
                <span class="tiktok-panel__label">{{ locale === 'en' ? 'videos' : "video's" }}</span>
              </li>
            </ul>
            <a :href="ttData.profile.url" target="_blank" rel="noopener" class="tiktok-panel__cta">
              {{ locale === 'en' ? 'View on TikTok' : 'Bekijk op TikTok' }} →
            </a>
          </div>

          <p v-else class="empty">
            {{ locale === 'en' ? 'No content available yet.' : "Nog geen content beschikbaar." }}
          </p>
        </RevealOnScroll>
      </SectionBlock>

      <SectionBlock
        id="collabs"
        tone="elevated"
        :eyebrow="(collabsCopy as any).eyebrow"
        :title="(collabsCopy as any).title"
        :intro="(collabsCopy as any).intro"
      >
        <div class="collab-grid">
          <RevealOnScroll v-for="(c, i) in collabs" :key="i" :delay="i * 60">
            <button type="button" class="collab" @click="openCollab = c">
              <div class="collab__head">
                <h3 class="collab__brand">{{ c.brand }}</h3>
                <span v-if="c.year" class="collab__year">{{ c.year }}</span>
              </div>
              <p v-if="c.kind" class="collab__kind">{{ c.kind }}</p>
              <p v-if="c.summary" class="collab__summary">{{ c.summary }}</p>
              <span class="collab__more">
                {{ locale === 'en' ? 'Read more' : 'Meer weten' }}
                <span aria-hidden="true">→</span>
              </span>
            </button>
          </RevealOnScroll>
        </div>
      </SectionBlock>

      <SectionBlock
        v-if="testimonials.length"
        id="testimonials"
        :eyebrow="(testimonialsCopy as any).eyebrow"
        :title="(testimonialsCopy as any).title"
        :intro="(testimonialsCopy as any).intro"
      >
        <div class="testimonial-grid">
          <RevealOnScroll v-for="(t, i) in testimonials" :key="i" :delay="i * 80">
            <TestimonialCard
              :quote="t.quote"
              :author="t.author"
              :role="t.role"
            />
          </RevealOnScroll>
        </div>
      </SectionBlock>

      <SectionBlock
        id="contact"
        :eyebrow="(contactCopy as any).eyebrow"
        :title="(contactCopy as any).title"
        :intro="(contactCopy as any).intro"
        align="center"
      >
        <div class="contact-channels">
          <div
            v-for="(ch, i) in contactChannels"
            :key="ch.id"
            class="contact-channel"
          >
            <div class="contact-channel__head">
              <span class="contact-channel__icon" aria-hidden="true">{{ ch.icon }}</span>
              <h3 class="contact-channel__title">{{ ch.title }}</h3>
              <p v-if="ch.intro" class="contact-channel__intro">{{ ch.intro }}</p>
            </div>
            <div class="contact-channel__tiles">
              <RevealOnScroll :delay="i * 60">
                <ContactTile
                  v-if="ch.phone"
                  kind="tel"
                  :value="ch.phone"
                  icon="📞"
                  :label="(contactCopy as any).phoneLabel"
                  :hint="(contactCopy as any).phoneHint"
                />
              </RevealOnScroll>
              <RevealOnScroll :delay="i * 60 + 60">
                <ContactTile
                  v-if="ch.whatsapp"
                  kind="whatsapp"
                  :value="ch.whatsapp"
                  :body="ch.waMessage"
                  icon="💬"
                  :label="(contactCopy as any).whatsappLabel"
                  :hint="(contactCopy as any).whatsappHint"
                />
              </RevealOnScroll>
              <RevealOnScroll :delay="i * 60 + 120">
                <ContactTile
                  v-if="ch.email"
                  kind="mailto"
                  :value="ch.email"
                  :subject="ch.mailSubject"
                  :body="ch.mailBody"
                  icon="✉"
                  :label="(contactCopy as any).emailLabel"
                  :hint="(contactCopy as any).emailHint"
                />
              </RevealOnScroll>
            </div>
          </div>
        </div>

        <div v-if="bioLinks.length" class="bio-links">
          <p class="bio-links__label">{{ locale === 'en' ? 'Also find Daan at' : 'Vind Daan ook op' }}</p>
          <ul class="bio-links__list">
            <li v-for="link in bioLinks" :key="link.url">
              <a :href="link.url" target="_blank" rel="noopener">
                <span aria-hidden="true">↗</span>
                <span>{{ link.label }}</span>
              </a>
            </li>
          </ul>
        </div>
      </SectionBlock>
    </main>

    <AppFooter
      :copyright="(footerCopy as any).copyright"
      :tagline="(heroCopy as any).tagline"
    >
      <template #brand>
        <BrandLogo variant="full" />
      </template>

      <template #navHeading>{{ locale === 'en' ? 'Navigate' : 'Navigeer' }}</template>
      <template #nav>
        <li v-for="item in navItems" :key="item.href">
          <a :href="item.href">{{ item.label }}</a>
        </li>
      </template>

      <template #socialsHeading>Socials</template>
      <template #socials>
        <li v-if="ytChannel">
          <a :href="`https://www.youtube.com/${ytChannel.customUrl}`" target="_blank" rel="noopener">
            YouTube — {{ formatCompact(ytChannel.subscriberCount) }}
          </a>
        </li>
        <li v-if="ttData?.profile">
          <a :href="ttData.profile.url" target="_blank" rel="noopener">
            TikTok — {{ formatCompact(ttData.stats?.followerCount) }}
          </a>
        </li>
        <li v-if="igData?.profile">
          <a :href="igData.profile.url" target="_blank" rel="noopener">
            Instagram — {{ formatCompact(igData.stats?.followerCount) }}
          </a>
        </li>
      </template>

      <template #legal>
        <a
          v-for="(l, i) in footerLinks"
          :key="i"
          :href="l.href"
          :target="l.external ? '_blank' : undefined"
          :rel="l.external ? 'noopener' : undefined"
        >{{ l.label?.[locale] || l.label?.nl }}</a>
      </template>
    </AppFooter>

    <Lightbox v-model:open="isServiceOpen" :title="openService?.title">
      <div v-if="openService" class="svc-detail">
        <p class="svc-detail__blurb">{{ openService.blurb }}</p>
        <div class="svc-detail__price">
          <span v-if="pricesVisible" class="eyebrow">{{ (servicesCopy as any).fromLabel }}</span>
          <span class="svc-detail__amount">{{ pricesVisible ? `${openService.currency}${openService.fromPrice?.toLocaleString('nl-NL')}` : priceOnRequestLabel }}</span>
        </div>
        <div v-if="openService.deliverables?.length" class="svc-detail__list">
          <h4>{{ (servicesCopy as any).deliverablesLabel }}</h4>
          <ul>
            <li v-for="d in openService.deliverables" :key="d">{{ d }}</li>
          </ul>
        </div>
        <CtaButton variant="gold" size="lg" href="#contact" @click="closeService">
          {{ (servicesCopy as any).ctaLabel }}
        </CtaButton>
      </div>
    </Lightbox>

    <Lightbox v-model:open="isCollabOpen" :title="openCollab?.brand">
      <div v-if="openCollab" class="collab-detail">
        <div class="collab-detail__head">
          <span v-if="openCollab.kind" class="collab-detail__kind">{{ openCollab.kind }}</span>
          <span v-if="openCollab.year" class="collab-detail__year">{{ openCollab.year }}</span>
        </div>
        <p class="collab-detail__description">{{ openCollab.description || openCollab.summary }}</p>
        <dl v-if="openCollab.businessWhat || openCollab.businessLocation || openCollab.businessWebsite" class="collab-detail__business">
          <template v-if="openCollab.businessWhat">
            <dt>{{ locale === 'en' ? 'What they do' : 'Wat ze doen' }}</dt>
            <dd>{{ openCollab.businessWhat }}</dd>
          </template>
          <template v-if="openCollab.businessLocation">
            <dt>{{ locale === 'en' ? 'Location' : 'Locatie' }}</dt>
            <dd>{{ openCollab.businessLocation }}</dd>
          </template>
          <template v-if="openCollab.businessWebsite">
            <dt>{{ locale === 'en' ? 'Website' : 'Website' }}</dt>
            <dd><a :href="openCollab.businessWebsite" target="_blank" rel="noopener">{{ openCollab.businessWebsite.replace(/^https?:\/\//, '').replace(/\/$/, '') }}</a></dd>
          </template>
        </dl>
        <a
          v-if="openCollab.href"
          :href="openCollab.href"
          target="_blank"
          rel="noopener"
          class="collab-detail__cta"
        >
          {{ locale === 'en' ? 'Visit ' : 'Bezoek ' }}{{ openCollab.brand }} →
        </a>
      </div>
    </Lightbox>
  </div>
</template>

<style scoped>
.hero-inner {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  max-width: 48rem;
}
.hero-title {
  font-size: var(--fs-900);
  font-weight: 800;
  line-height: 0.95;
  margin-block: var(--s-3) var(--s-4);
}
.hero-tag {
  font-family: var(--ff-display);
  font-size: clamp(1.5rem, 3.2vw, 2.25rem);
  font-weight: 600;
  font-style: italic;
  color: var(--c-fg);
  line-height: var(--lh-snug);
  background: linear-gradient(120deg, var(--c-fg) 0%, var(--c-fg-soft) 60%, var(--c-fg-muted) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.hero-intro {
  color: var(--c-fg-muted);
  font-size: var(--fs-500);
  line-height: var(--lh-body);
  white-space: pre-line;
  max-width: 42rem;
}
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-4);
  margin-top: var(--s-5);
}

.stats {
  padding-block: var(--s-7);
  background: var(--c-bg);
}

/* Performances spotlight — full-bleed band with video/image bg */
.spotlight {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  min-height: 60vh;
  display: flex;
  align-items: center;
  padding-block: var(--s-9);
  background: var(--c-bg);
}
.spotlight__bg {
  position: absolute;
  inset: -4% -2%;
  width: 104%;
  height: 108%;
  object-fit: cover;
  z-index: -2;
  filter: saturate(0.85) brightness(0.55);
}
.spotlight__veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(10, 9, 8, 0.75) 0%, rgba(10, 9, 8, 0.55) 40%, rgba(10, 9, 8, 0.92) 100%),
    radial-gradient(60% 50% at 30% 50%, rgba(212, 175, 55, 0.08), transparent 70%);
}
.spotlight__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.1;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
}
.spotlight__inner {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-7);
  align-items: center;
  position: relative;
  z-index: 1;
}
@media (min-width: 900px) {
  .spotlight__inner { grid-template-columns: 1.4fr 1fr; }
}
.spotlight__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  max-width: 36rem;
}
.spotlight__live {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  align-self: flex-start;
  padding: 0.4em 1em;
  font-size: var(--fs-300);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg);
  background: rgba(10, 9, 8, 0.55);
  border: 1px solid rgba(245, 241, 232, 0.25);
  border-radius: var(--radius-pill);
  backdrop-filter: blur(8px);
}
.spotlight__live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-gold);
  box-shadow: 0 0 12px var(--c-gold);
  animation: live-pulse 1.6s ease-in-out infinite;
}
@keyframes live-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.45; transform: scale(0.7); }
}
@media (prefers-reduced-motion: reduce) {
  .spotlight__live-dot { animation: none; }
}
.spotlight__title {
  font-family: var(--ff-display);
  font-weight: 800;
  font-size: clamp(2.5rem, 6vw, 4.5rem);
  line-height: 0.95;
  letter-spacing: var(--tracking-tight);
  margin: 0;
}
.spotlight__intro {
  font-size: var(--fs-500);
  color: var(--c-fg-soft);
  line-height: var(--lh-body);
  white-space: pre-line;
  margin: 0;
}
.spotlight__action {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-4);
  padding: var(--s-6);
  background: rgba(10, 9, 8, 0.6);
  border: 1px solid rgba(245, 241, 232, 0.15);
  border-radius: var(--radius-md);
  backdrop-filter: blur(12px);
}
@media (min-width: 900px) {
  .spotlight__action { justify-self: end; min-width: 22rem; }
}
.spotlight__price {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
}
.spotlight__price-value {
  font-family: var(--ff-display);
  font-weight: 800;
  font-size: var(--fs-900);
  line-height: 1;
  color: var(--c-fg);
}
/* When showing "Prijs op aanvraag" instead of a number, scale the type
   way down — the label is long and the display-9 size only fits an amount. */
.spotlight__price-value--label {
  font-size: var(--fs-700);
  font-weight: 600;
  font-style: italic;
  letter-spacing: var(--tracking-tight);
  line-height: var(--lh-snug);
}
.spotlight__hint {
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
  letter-spacing: var(--tracking-wide);
  margin: 0;
}

/* Live badge on the Op het podium svc-channel card */
.svc-channel--live { position: relative; }
.svc-channel__badge {
  position: absolute;
  top: var(--s-3);
  right: var(--s-3);
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.3em 0.8em;
  font-size: var(--fs-300);
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg);
  background: rgba(212, 175, 55, 0.12);
  border: 1px solid rgba(212, 175, 55, 0.3);
  border-radius: var(--radius-pill);
}
.svc-channel__badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-gold);
  box-shadow: 0 0 8px var(--c-gold);
  animation: live-pulse 1.6s ease-in-out infinite;
}

/* atmospheric backdrops — narrow vertical washes, hue shifts only at edges */
:deep(#about) {
  background:
    linear-gradient(180deg, rgba(180, 130, 80, 0.025) 0%, transparent 30%, transparent 70%, rgba(120, 90, 50, 0.02) 100%),
    var(--c-bg);
}
:deep(#services) {
  background: var(--c-bg-elev-1);
}
:deep(#socials) {
  background:
    linear-gradient(180deg, rgba(140, 110, 130, 0.025) 0%, transparent 40%),
    var(--c-bg);
}
:deep(#collabs) {
  background: var(--c-bg-elev-1);
}
:deep(#testimonials) {
  background:
    linear-gradient(180deg, rgba(130, 90, 110, 0.03) 0%, transparent 35%, transparent 65%, rgba(110, 80, 60, 0.025) 100%),
    var(--c-bg);
}
:deep(#contact) {
  background:
    linear-gradient(180deg, transparent 0%, transparent 60%, rgba(212, 175, 55, 0.03) 100%),
    var(--c-bg);
}

.marquee-band {
  background: var(--c-bg);
  border-block: 1px solid var(--c-line);
  position: relative;
  z-index: 2;
}
.marquee-band :deep(.marquee__link) {
  font-style: italic;
  color: var(--c-fg-soft);
  letter-spacing: var(--tracking-tight);
}
.marquee-band :deep(.marquee__link::after) {
  content: '·';
  margin-left: var(--s-7);
  color: var(--c-fg-dim);
  font-style: normal;
}

.svc-channels {
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
  gap: var(--s-6);
}
@media (min-width: 720px) {
  .svc-channels { grid-template-columns: repeat(2, 1fr); }
}
.svc-channel {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6) var(--s-5);
  background: var(--c-bg-elev-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  position: relative;
  height: 100%;
}
.svc-channel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--c-fg) 0%, var(--c-fg-dim) 60%, transparent 100%);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.svc-channel__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.svc-channel__icon { font-size: 1.75rem; line-height: 1; }
.svc-channel__title {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-600);
  margin: 0;
}
.svc-channel__intro {
  font-size: var(--fs-400);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  margin: 0;
  min-height: 2.5em;
}
.svc-channel__tiles {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  flex: 1;
}
.svc-tile {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  padding: var(--s-4) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: transform var(--transition-fast), border-color var(--transition-base), background var(--transition-base);
}
.svc-tile:hover {
  transform: translateY(-2px);
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-2);
}
.svc-tile__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}
.svc-tile__title {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-500);
  color: var(--c-fg);
}
.svc-tile__price {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-500);
  color: var(--c-fg);
  white-space: nowrap;
}
.svc-tile__blurb {
  font-size: var(--fs-400);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  margin: 0;
  flex: 1;
}
.svc-tile__cta {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-dim);
  transition: color var(--transition-fast);
}
.svc-tile:hover .svc-tile__cta { color: var(--c-gold); }

.svc-extras {
  margin-top: var(--s-7);
}
.svc-extras__label {
  font-family: var(--ff-body);
  font-size: var(--fs-300);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-soft);
  margin: 0 0 var(--s-4) 0;
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
}
.svc-extras__label::before {
  content: '';
  width: 1.5em;
  height: 1px;
  background: var(--c-fg-muted);
}
.svc-extras__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-3);
}
@media (min-width: 720px) {
  .svc-extras__grid { grid-template-columns: repeat(2, 1fr); }
}
.svc-extra {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: transform var(--transition-fast), border-color var(--transition-base), background var(--transition-base);
}
.svc-extra:hover {
  transform: translateY(-1px);
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-2);
}
.svc-extra__icon { font-size: 1.5rem; line-height: 1; }
.svc-extra__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.svc-extra__title {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-500);
  color: var(--c-fg);
}
.svc-extra__blurb {
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.svc-extra__price {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-500);
  color: var(--c-fg);
  white-space: nowrap;
}

.collab-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
  gap: var(--s-5);
}
@media (min-width: 720px) {
  .collab-grid { grid-template-columns: repeat(3, 1fr); }
}
.collab {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  height: 100%;
  width: 100%;
  padding: var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  color: inherit;
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
}
.collab:hover {
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-2);
  transform: translateY(-2px);
}
.collab__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--s-3);
}
.collab__brand {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-600);
  margin: 0;
}
.collab__year {
  color: var(--c-fg-dim);
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
}
.collab__kind {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-soft);
  margin: 0;
}
.collab__summary {
  color: var(--c-fg-muted);
  font-size: var(--fs-400);
  line-height: var(--lh-snug);
  flex: 1;
  margin: 0;
}
.collab__more {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-dim);
  display: inline-flex;
  align-items: center;
  gap: 0.4em;
  transition: color var(--transition-fast);
}
.collab:hover .collab__more {
  color: var(--c-gold);
}

/* Collab lightbox */
.collab-detail {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.collab-detail__head {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  align-items: baseline;
}
.collab-detail__kind {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-soft);
  padding: 0.3em 0.8em;
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
}
.collab-detail__year {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-500);
  color: var(--c-fg-muted);
}
.collab-detail__description {
  font-size: var(--fs-500);
  color: var(--c-fg-muted);
  line-height: var(--lh-body);
  margin: 0;
}
.collab-detail__business {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: var(--s-2) var(--s-5);
  padding: var(--s-4);
  background: var(--c-bg-elev-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  margin: 0;
}
.collab-detail__business dt {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-dim);
  font-weight: 500;
}
.collab-detail__business dd {
  margin: 0;
  font-size: var(--fs-400);
  color: var(--c-fg);
}
.collab-detail__business a {
  color: var(--c-fg);
  border-bottom: 1px solid var(--c-line-strong);
  padding-bottom: 2px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.collab-detail__business a:hover {
  color: var(--c-gold);
  border-color: var(--c-gold);
}
.collab-detail__cta {
  align-self: flex-start;
  padding: 0.85em 1.4em;
  font-size: var(--fs-400);
  font-weight: 600;
  background: var(--c-fg);
  color: var(--c-bg);
  border-radius: var(--radius-pill);
  transition: background var(--transition-fast);
}
.collab-detail__cta:hover { background: var(--c-gold); }

.platforms {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-3);
  margin-bottom: var(--s-6);
}
@media (min-width: 720px) {
  .platforms { grid-template-columns: repeat(3, 1fr); }
}
.platform-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  transition: border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast);
  text-decoration: none;
  color: inherit;
}
.platform-card:hover {
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-2);
  transform: translateY(-1px);
}
.platform-card.is-active {
  border-color: var(--c-fg-soft);
  background: var(--c-bg-elev-2);
}
.platform-card__icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  background: rgba(245, 241, 232, 0.06);
  border-radius: 50%;
  color: var(--c-fg);
  font-size: 1.1rem;
  font-weight: 700;
}
.platform-card.is-active .platform-card__icon {
  background: rgba(212, 175, 55, 0.15);
  color: var(--c-gold);
}
.platform-card__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.platform-card__handle {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-500);
  color: var(--c-fg);
}
.platform-card__sub {
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
  letter-spacing: var(--tracking-wide);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.platform-card__count {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-600);
  color: var(--c-fg);
  white-space: nowrap;
}

/* Instagram grid */
.ig-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s-3);
}
@media (min-width: 720px) {
  .ig-grid { grid-template-columns: repeat(3, 1fr); }
}
.ig-post {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--c-line);
  background: var(--c-bg-elev-1);
}
.ig-post img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-base);
}
.ig-post:hover img { transform: scale(1.05); }
.ig-post__overlay {
  position: absolute;
  inset: auto 0 0 0;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.75));
  color: var(--c-fg);
  font-size: var(--fs-300);
  letter-spacing: 0.04em;
}
.ig-post__stat { display: inline-flex; gap: 0.3em; align-items: center; }
.ig-post__badge {
  margin-left: auto;
  padding: 2px 0.5em;
  background: rgba(245, 241, 232, 0.15);
  border-radius: var(--radius-sm);
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
}

/* TikTok panel — profile-style since video list isn't in scrape */
.tiktok-panel {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  text-align: center;
  align-items: center;
}
.tiktok-panel__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-3);
}
.tiktok-panel__head img {
  width: 5rem;
  height: 5rem;
  border-radius: 50%;
  border: 2px solid var(--c-line-strong);
}
.tiktok-panel__name {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-600);
  margin: 0;
}
.tiktok-panel__bio {
  font-size: var(--fs-400);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  white-space: pre-line;
  max-width: 32rem;
  margin: 0;
}
.tiktok-panel__stats {
  display: flex;
  gap: var(--s-7);
  padding: var(--s-4) 0;
  border-block: 1px solid var(--c-line);
  width: 100%;
  justify-content: center;
}
.tiktok-panel__stats li {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
}
.tiktok-panel__num {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-700);
  color: var(--c-fg);
}
.tiktok-panel__label {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-muted);
}
.tiktok-panel__cta {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg);
  border-bottom: 1px solid var(--c-fg-muted);
  padding-bottom: 2px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.tiktok-panel__cta:hover {
  color: var(--c-gold);
  border-color: var(--c-gold);
}

.bio-links {
  margin-top: var(--s-7);
  text-align: center;
}
.bio-links__label {
  font-family: var(--ff-body);
  font-size: var(--fs-300);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-soft);
  margin: 0 0 var(--s-4) 0;
}
.bio-links__list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-3);
  list-style: none;
  padding: 0;
  margin: 0;
}
.bio-links__list a {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 0.6em 1.2em;
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
  font-size: var(--fs-300);
  letter-spacing: 0.04em;
  color: var(--c-fg);
  transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
}
.bio-links__list a:hover {
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-2);
  color: var(--c-gold);
}

.socials-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  margin-bottom: var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-pill);
}
.socials-toggle__btn {
  padding: 0.5em 1.25em;
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-muted);
  background: transparent;
  border: 0;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.socials-toggle__btn:hover { color: var(--c-fg); }
.socials-toggle__btn.is-active {
  background: var(--c-bg-elev-2);
  color: var(--c-fg);
}

.testimonial-grid {
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
  gap: var(--s-5);
}
@media (min-width: 720px) {
  .testimonial-grid { grid-template-columns: repeat(3, 1fr); }
}

.contact-channels {
  display: grid;
  grid-template-columns: 1fr;
  grid-auto-rows: 1fr;
  gap: var(--s-6);
  max-width: 72rem;
  margin-inline: auto;
}
@media (min-width: 720px) {
  .contact-channels { grid-template-columns: repeat(2, 1fr); }
}
.contact-channel {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
  padding: var(--s-6) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  position: relative;
}
.contact-channel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--c-fg) 0%, var(--c-fg-dim) 60%, transparent 100%);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
}
.contact-channel__head {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  text-align: left;
}
.contact-channel__icon {
  font-size: 1.75rem;
  line-height: 1;
}
.contact-channel__title {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-600);
  color: var(--c-fg);
  margin: 0;
}
.contact-channel__intro {
  font-size: var(--fs-400);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  margin: 0;
  min-height: 2.5em;
}
.contact-channel__tiles {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}

.empty {
  padding: var(--s-7);
  text-align: center;
  color: var(--c-fg-dim);
  border: 1px dashed var(--c-line);
  border-radius: var(--radius-md);
}
.empty code {
  font-family: ui-monospace, Menlo, monospace;
  font-size: 0.9em;
  color: var(--c-fg-muted);
}

.svc-detail {
  display: flex;
  flex-direction: column;
  gap: var(--s-5);
}
.svc-detail__blurb {
  font-size: var(--fs-500);
  color: var(--c-fg-muted);
  line-height: var(--lh-body);
}
.svc-detail__price {
  display: flex;
  flex-direction: column;
  gap: var(--s-1);
  padding: var(--s-4);
  background: var(--c-bg-elev-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
}
.svc-detail__amount {
  font-family: var(--ff-display);
  font-weight: 800;
  font-size: var(--fs-800);
  color: var(--c-fg);
}
.svc-detail__list h4 {
  font-family: var(--ff-display);
  font-size: var(--fs-500);
  margin-bottom: var(--s-3);
}
.svc-detail__list ul {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
}
.svc-detail__list li {
  position: relative;
  padding-left: var(--s-5);
  color: var(--c-fg-muted);
}
.svc-detail__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.7em;
  width: 12px;
  height: 1px;
  background: var(--c-fg-soft);
}
</style>
