<script setup lang="ts">
const props = withDefaults(defineProps<{
  items: Array<{ label: string; href?: string; src?: string }>
  speed?: number
  direction?: 'left' | 'right'
}>(), {
  speed: 40,
  direction: 'left',
})

const loop = computed(() => [...props.items, ...props.items])
</script>

<template>
  <div class="marquee" :class="`marquee--${direction}`" :style="{ '--duration': `${speed}s` }">
    <ul class="marquee__track">
      <li v-for="(it, i) in loop" :key="i" class="marquee__item">
        <component
          :is="it.href ? 'a' : 'span'"
          :href="it.href"
          target="_blank"
          rel="noopener"
          class="marquee__link"
        >
          <img v-if="it.src" :src="it.src" :alt="it.label" class="marquee__logo">
          <span v-else>{{ it.label }}</span>
        </component>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.marquee {
  overflow: hidden;
  mask-image: linear-gradient(90deg, transparent, #000 12%, #000 88%, transparent);
  padding-block: var(--s-5);
}
.marquee__track {
  display: flex;
  gap: var(--s-7);
  width: max-content;
  animation: scroll var(--duration, 40s) linear infinite;
}
.marquee--right .marquee__track {
  animation-direction: reverse;
}
.marquee__item {
  flex-shrink: 0;
}
.marquee__link {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-700);
  color: var(--c-fg-muted);
  letter-spacing: var(--tracking-tight);
  transition: color var(--transition-fast);
}
.marquee__link:hover {
  color: var(--c-gold);
}
.marquee__logo {
  height: 2.25rem;
  width: auto;
  filter: grayscale(1) brightness(1.1);
  opacity: 0.7;
  transition: filter var(--transition-fast), opacity var(--transition-fast);
}
.marquee__link:hover .marquee__logo {
  filter: none;
  opacity: 1;
}
@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
</style>
