<script setup lang="ts">
const props = withDefaults(defineProps<{
  value: number
  label?: string
  prefix?: string
  suffix?: string
  duration?: number
  decimals?: number
}>(), {
  duration: 1600,
  decimals: 0,
})

const useCompact = computed(() => props.value >= 10000)

const root = ref<HTMLElement | null>(null)
const display = ref(0)
const revealed = ref(false)

function format(n: number) {
  if (useCompact.value) {
    return n.toLocaleString('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).replace(/\.0/, '')
  }
  return n.toLocaleString('nl-NL', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
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
        animate()
        obs.disconnect()
      }
    }
  }, { threshold: 0.4 })
  obs.observe(root.value)

  function animate() {
    const start = performance.now()
    const from = 0
    const to = props.value
    function tick(now: number) {
      const t = Math.min((now - start) / props.duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      display.value = from + (to - from) * eased
      if (t < 1) requestAnimationFrame(tick)
      else display.value = to
    }
    requestAnimationFrame(tick)
  }
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
</style>
