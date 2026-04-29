<script setup lang="ts">
interface SectionRef {
  id: string
  label: string
}

defineProps<{
  sections: SectionRef[]
}>()

const active = ref<string | null>(null)

let observer: IntersectionObserver | null = null

onMounted(() => {
  if (typeof IntersectionObserver === 'undefined') return
  const els = document.querySelectorAll<HTMLElement>('[data-progress-id]')
  if (!els.length) return

  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(e => e.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)
    if (visible[0]) active.value = (visible[0].target as HTMLElement).dataset.progressId || null
  }, { threshold: [0.25, 0.5, 0.75], rootMargin: '-20% 0px -40% 0px' })

  els.forEach(el => observer!.observe(el))
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <nav class="progress" aria-label="Section progress">
    <a
      v-for="s in sections"
      :key="s.id"
      :href="`#${s.id}`"
      class="progress__dot"
      :class="{ 'is-active': active === s.id }"
      :aria-label="s.label"
      :aria-current="active === s.id ? 'true' : undefined"
    >
      <span class="progress__label">{{ s.label }}</span>
    </a>
  </nav>
</template>

<style scoped>
.progress {
  position: fixed;
  top: 50%;
  right: var(--s-5);
  transform: translateY(-50%);
  display: none;
  flex-direction: column;
  gap: var(--s-4);
  z-index: var(--z-nav);
}
.progress__dot {
  position: relative;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 1px solid var(--c-fg-muted);
  background: transparent;
  transition: background var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
  cursor: pointer;
}
.progress__dot:hover {
  border-color: var(--c-gold);
  transform: scale(1.3);
}
.progress__dot.is-active {
  background: var(--c-gold);
  border-color: var(--c-gold);
  box-shadow: 0 0 0 4px rgba(212, 175, 55, 0.18);
}
.progress__label {
  position: absolute;
  right: calc(100% + var(--s-3));
  top: 50%;
  transform: translateY(-50%) translateX(8px);
  white-space: nowrap;
  font-size: var(--fs-300);
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-muted);
  background: rgba(10, 9, 8, 0.86);
  padding: 0.4em 0.8em;
  border-radius: var(--radius-pill);
  border: 1px solid var(--c-line);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-fast), transform var(--transition-fast);
  backdrop-filter: blur(8px);
}
.progress__dot:hover .progress__label,
.progress__dot.is-active .progress__label {
  opacity: 1;
  transform: translateY(-50%) translateX(0);
}

@media (min-width: 1024px) {
  .progress { display: flex; }
}
@media (prefers-reduced-motion: reduce) {
  .progress__dot,
  .progress__label { transition: none; }
}
</style>
