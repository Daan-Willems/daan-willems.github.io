<script setup lang="ts">
const props = withDefaults(defineProps<{
  as?: string
  delay?: number
  offset?: string
  once?: boolean
}>(), {
  as: 'div',
  delay: 0,
  offset: '0px 0px -80px 0px',
  once: true,
})

const root = ref<HTMLElement | null>(null)
const visible = ref(false)

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    visible.value = true
    return
  }
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        visible.value = true
        if (props.once) obs.disconnect()
      } else if (!props.once) {
        visible.value = false
      }
    }
  }, { rootMargin: props.offset })
  obs.observe(root.value)
  onBeforeUnmount(() => obs.disconnect())
})
</script>

<template>
  <component
    :is="as"
    ref="root"
    class="reveal"
    :class="{ 'is-visible': visible }"
    :style="{ transitionDelay: `${delay}ms` }"
  >
    <slot />
  </component>
</template>

<style scoped>
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity var(--transition-slow), transform var(--transition-slow);
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}
.reveal > * { flex: 1; }
.reveal.is-visible {
  opacity: 1;
  transform: none;
}
</style>
