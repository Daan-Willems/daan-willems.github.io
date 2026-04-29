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

const { content, load } = useRuntimeContent()
const { socials: socialsData, load: loadSocials } = useSocialsData()
onMounted(() => {
  load()
  loadSocials()
})

const stats = computed(() => (content.value?.stats || []).map(s => ({
  value: s.value,
  prefix: s.prefix,
  suffix: s.suffix,
  label: s.label?.[locale.value] || s.label?.nl || '',
})))

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

const collabs = computed(() => (content.value?.collabs || []).map(c => ({
  ...c,
  summary: c.summary?.[locale.value] || c.summary?.nl || '',
})))

const testimonials = computed(() => (content.value?.testimonials || []).map(t => ({
  ...t,
  quote: t.quote?.[locale.value] || t.quote?.nl || '',
  role: t.role?.[locale.value] || t.role?.nl || '',
})))

// Socials videos: prefer the Action-fed JSON; fall back to curated URLs in content.json
const youtubeUrls = computed(() => content.value?.socials?.youtube?.curatedUrls || [])
const ytLatest = computed(() => socialsData.value?.youtube?.latest || [])

const navItems = computed(() => (navCopy.value as any).items || [])
const footerLinks = computed(() => (footerCopy.value as any).links || [])
const marqueeItems = computed(() => (marqueeCopy.value as any).items || [])

const progressSections = computed(() => [
  { id: 'top', label: locale.value === 'en' ? 'Hero' : 'Start' },
  { id: 'about', label: (aboutCopy.value as any).eyebrow || (locale.value === 'en' ? 'Story' : 'Verhaal') },
  { id: 'services', label: (servicesCopy.value as any).eyebrow || (locale.value === 'en' ? 'Services' : 'Diensten') },
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
const mailHref = computed(() => contactRuntime.value?.email)

const contactChannels = computed(() => (contactRuntime.value?.channels || []).map(c => ({
  id: c.id,
  icon: c.icon,
  title: c.title?.[locale.value] || c.title?.nl || '',
  intro: c.intro?.[locale.value] || c.intro?.nl || '',
  mailSubject: c.mailSubject?.[locale.value] || c.mailSubject?.nl || '',
  mailBody: c.mailBody?.[locale.value] || c.mailBody?.nl || '',
  waMessage: c.waMessage?.[locale.value] || c.waMessage?.nl || '',
})))

useHead({
  htmlAttrs: { lang: locale },
  title: () => `Daan Willems — ${(heroCopy.value as any).tagline || ''}`,
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
                    <span class="svc-tile__price">{{ s.currency }}{{ formatPrice(s.fromPrice) }}</span>
                  </div>
                  <p class="svc-tile__blurb">{{ s.blurb }}</p>
                  <span class="svc-tile__cta">{{ (servicesCopy as any).moreLabel }} <span aria-hidden="true">→</span></span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll :delay="80">
            <div class="svc-channel">
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
                    <span class="svc-tile__price">{{ s.currency }}{{ formatPrice(s.fromPrice) }}</span>
                  </div>
                  <p class="svc-tile__blurb">{{ s.blurb }}</p>
                  <span class="svc-tile__cta">{{ (servicesCopy as any).moreLabel }} <span aria-hidden="true">→</span></span>
                </button>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </SectionBlock>

      <SectionBlock
        id="socials"
        :eyebrow="(socialsCopy as any).eyebrow"
        :title="(socialsCopy as any).title"
        :intro="(socialsCopy as any).intro"
      >
        <RevealOnScroll>
          <MediaGrid
            v-if="ytLatest.length"
            :items="ytLatest.map(v => ({ url: v.url, title: v.title, thumb: v.thumbnail || undefined }))"
            :columns="3"
          />
          <MediaGrid
            v-else-if="youtubeUrls.length"
            :items="youtubeUrls.map(url => ({ url }))"
            :columns="3"
          />
          <p v-else class="empty">Geen video's geconfigureerd. Voeg URLs toe in <code>public/data/content.json</code>.</p>
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
            <Card variant="default">
              <div class="collab">
                <div class="collab__head">
                  <h3 class="collab__brand">{{ c.brand }}</h3>
                  <span v-if="c.year" class="collab__year">{{ c.year }}</span>
                </div>
                <p v-if="c.summary" class="collab__summary">{{ c.summary }}</p>
                <a v-if="c.href" :href="c.href" target="_blank" rel="noopener" class="collab__link">
                  Bekijk →
                </a>
              </div>
            </Card>
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
                  v-if="phoneHref"
                  kind="tel"
                  :value="phoneHref"
                  icon="📞"
                  :label="(contactCopy as any).phoneLabel"
                  :hint="(contactCopy as any).phoneHint"
                />
              </RevealOnScroll>
              <RevealOnScroll :delay="i * 60 + 60">
                <ContactTile
                  v-if="waHref"
                  kind="whatsapp"
                  :value="waHref"
                  :body="ch.waMessage"
                  icon="💬"
                  :label="(contactCopy as any).whatsappLabel"
                  :hint="(contactCopy as any).whatsappHint"
                />
              </RevealOnScroll>
              <RevealOnScroll :delay="i * 60 + 120">
                <ContactTile
                  v-if="mailHref"
                  kind="mailto"
                  :value="mailHref"
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
      </SectionBlock>
    </main>

    <AppFooter :copyright="(footerCopy as any).copyright">
      <template #brand>
        <BrandLogo variant="full" />
      </template>
      <a
        v-for="(l, i) in footerLinks"
        :key="i"
        :href="l.href"
        :target="l.external ? '_blank' : undefined"
        :rel="l.external ? 'noopener' : undefined"
      >{{ l.label?.[locale] || l.label?.nl }}</a>
    </AppFooter>

    <Lightbox v-model:open="isServiceOpen" :title="openService?.title">
      <div v-if="openService" class="svc-detail">
        <p class="svc-detail__blurb">{{ openService.blurb }}</p>
        <div class="svc-detail__price">
          <span class="eyebrow">{{ (servicesCopy as any).fromLabel }}</span>
          <span class="svc-detail__amount">{{ openService.currency }}{{ openService.fromPrice?.toLocaleString('nl-NL') }}</span>
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
}
.collab__year {
  color: var(--c-fg-dim);
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
}
.collab__summary {
  color: var(--c-fg-muted);
  font-size: var(--fs-400);
  flex: 1;
}
.collab__link {
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg);
  align-self: flex-start;
  border-bottom: 1px solid var(--c-line-strong);
  padding-bottom: 2px;
  transition: color var(--transition-fast), border-color var(--transition-fast);
}
.collab__link:hover {
  color: var(--c-gold);
  border-bottom-color: var(--c-gold);
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
