<script setup lang="ts">
withDefaults(defineProps<{
  bgType?: 'image' | 'video' | 'gradient'
  bgSrc?: string
  poster?: string
  parallax?: boolean
}>(), {
  bgType: 'gradient',
  parallax: true,
})

const bgEl = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!bgEl.value) return
  const onScroll = () => {
    if (!bgEl.value) return
    const y = Math.min(window.scrollY * 0.35, 240)
    bgEl.value.style.transform = `translate3d(0, ${y}px, 0) scale(1.06)`
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <section class="hero" id="top" data-progress-id="top">
    <div ref="bgEl" class="hero__bg" :class="`hero__bg--${bgType}`">
      <video
        v-if="bgType === 'video' && bgSrc"
        class="hero__media"
        :src="bgSrc"
        :poster="poster"
        autoplay
        muted
        loop
        playsinline
        preload="metadata"
        aria-hidden="true"
      />
      <img
        v-else-if="bgType === 'image' && bgSrc"
        class="hero__media"
        :src="bgSrc"
        alt=""
        aria-hidden="true"
      >
    </div>
    <div class="hero__veil" aria-hidden="true" />
    <div class="hero__grain" aria-hidden="true" />
    <div class="hero__inner container">
      <slot />
    </div>
    <div class="hero__scroll" aria-hidden="true">
      <span /><span /><span />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  display: flex;
  align-items: center;
  isolation: isolate;
  overflow: hidden;
}
.hero__bg {
  position: absolute;
  inset: -8% -2% -8% -2%;
  z-index: -2;
  will-change: transform;
}
.hero__bg--gradient {
  background:
    radial-gradient(80% 60% at 70% 30%, rgba(212, 175, 55, 0.18), transparent 60%),
    radial-gradient(60% 50% at 20% 80%, rgba(212, 175, 55, 0.08), transparent 60%),
    linear-gradient(180deg, #0a0908 0%, #131110 100%);
}
.hero__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.hero__veil {
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(180deg, rgba(10, 9, 8, 0.4) 0%, rgba(10, 9, 8, 0.2) 30%, rgba(10, 9, 8, 0.92) 100%),
    radial-gradient(120% 80% at 50% 100%, rgba(10, 9, 8, 0.9), transparent 50%);
}
.hero__grain {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.12;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  background-size: 220px 220px;
}
@media (prefers-reduced-motion: reduce) {
  .hero__grain { display: none; }
}
.hero__inner {
  width: 100%;
  position: relative;
  padding-block: var(--s-9) var(--s-8);
}
.hero__scroll {
  position: absolute;
  inset: auto 0 var(--s-5) 0;
  display: flex;
  justify-content: center;
  gap: 4px;
}
.hero__scroll span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--c-gold);
  opacity: 0.4;
  animation: pulse 1.6s ease-in-out infinite;
}
.hero__scroll span:nth-child(2) { animation-delay: 0.2s; }
.hero__scroll span:nth-child(3) { animation-delay: 0.4s; }
@keyframes pulse {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.3); }
}
</style>
