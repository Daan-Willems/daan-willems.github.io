<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  label?: string
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
  detail?: string
}>(), {
  duration: 1600,
  decimals: 0,
})

const useCompact = computed(() => props.value >= 10000)

const root = ref<HTMLElement | null>(null)
const display = ref(0)
const revealed = ref(false)
let rafId: number | null = null

function format(n: number) {
  if (useCompact.value) {
    return n.toLocaleString('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
      // @ts-ignore — supported in modern Node/browsers, types may lag
      roundingMode: 'ceil',
    }).replace(/\.0/, '')
  }
  return n.toLocaleString('nl-NL', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
}

function animate(from: number, to: number) {
  if (rafId !== null) cancelAnimationFrame(rafId)
  const start = performance.now()
  function tick(now: number) {
    const t = Math.min((now - start) / props.duration, 1)
    const eased = 1 - Math.pow(1 - t, 3)
    display.value = from + (to - from) * eased
    if (t < 1) rafId = requestAnimationFrame(tick)
    else { display.value = to; rafId = null }
  }
  rafId = requestAnimationFrame(tick)
}

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    display.value = props.value
    return
  }
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        revealed.value = true
        animate(0, props.value)
        obs.disconnect()
      }
    }
  }, { threshold: 0.4 })
  obs.observe(root.value)
})

// Re-animate when props.value changes after reveal — async data load
// (socials.json) often arrives after the stat section has scrolled into
// view with value=0, and without this the counter stays stuck at 0.
watch(() => props.value, (next) => {
  if (revealed.value) animate(display.value, next)
})
</script>

<template>
  <div ref="root" class="stat" :class="{ 'is-revealed': revealed }">
    <div class="stat__value">
      <span v-if="prefix" class="stat__affix">{{ prefix }}</span>
      <span class="stat__num">{{ format(display) }}</span>
      <span v-if="suffix" class="stat__affix">{{ suffix }}</span>
    </div>
    <div v-if="label" class="stat__label">{{ label }}</div>
    <div v-if="detail" class="stat__detail">{{ detail }}</div>
  </div>
</template>

<style scoped>
.stat {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
  text-align: left;
  padding-top: var(--s-4);
}
.stat::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 2.5rem;
  height: 2px;
  background: linear-gradient(90deg, var(--c-fg) 0%, transparent 100%);
  transform-origin: left;
  transform: scaleX(0);
  transition: transform 0.8s cubic-bezier(0.65, 0, 0.35, 1) 0.1s;
}
.stat.is-revealed::before {
  transform: scaleX(1);
}
.stat__value {
  font-family: var(--ff-display);
  font-weight: 800;
  font-size: clamp(3rem, 7vw, 5rem);
  letter-spacing: var(--tracking-tight);
  line-height: 0.9;
  background: linear-gradient(135deg, var(--c-fg) 0%, var(--c-fg-soft) 60%, var(--c-fg-muted) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  display: flex;
  align-items: baseline;
  gap: 0.08em;
  text-shadow: 0 0 40px rgba(245, 241, 232, 0.12);
}
.stat__affix {
  font-size: 0.55em;
  font-weight: 600;
  font-style: italic;
  letter-spacing: var(--tracking-tight);
}
.stat__label {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-muted);
  font-weight: 500;
}
.stat__detail {
  font-size: var(--fs-300);
  color: var(--c-fg-dim);
  line-height: var(--lh-snug);
  margin-top: var(--s-1);
}
</style>
