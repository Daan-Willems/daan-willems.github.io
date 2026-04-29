<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'default' | 'glow' | 'flat'
  interactive?: boolean
  as?: string
}>(), {
  variant: 'default',
  interactive: false,
  as: 'div',
})
</script>

<template>
  <component
    :is="as"
    class="card"
    :class="[`card--${variant}`, { 'card--interactive': interactive }]"
  >
    <slot />
  </component>
</template>

<style scoped>
.card {
  position: relative;
  background: var(--c-bg-elev-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-lg);
  padding: var(--s-6);
  transition: transform var(--transition-base), border-color var(--transition-base), box-shadow var(--transition-base);
}
.card--glow::before {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, transparent 30%, var(--c-gold) 50%, transparent 70%);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0.5;
  pointer-events: none;
  transition: opacity var(--transition-base);
}
.card--flat {
  background: transparent;
  border-color: var(--c-line);
}
.card--interactive {
  cursor: pointer;
}
.card--interactive:hover {
  transform: translateY(-4px);
  border-color: var(--c-gold-deep);
  box-shadow: var(--shadow-soft);
}
.card--interactive.card--glow:hover::before {
  opacity: 1;
}
</style>
