<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'primary' | 'ghost' | 'gold'
  href?: string
  size?: 'md' | 'lg'
  target?: string
  rel?: string
}>(), {
  variant: 'primary',
  size: 'md',
})
</script>

<template>
  <component
    :is="href ? 'a' : 'button'"
    :href="href"
    :target="target"
    :rel="target === '_blank' ? (rel || 'noopener') : rel"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`]"
  >
    <span class="btn__label"><slot /></span>
    <span v-if="$slots.icon" class="btn__icon"><slot name="icon" /></span>
  </component>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--s-3);
  padding: 0.85em 1.4em;
  border-radius: var(--radius-pill);
  font-family: var(--ff-body);
  font-weight: 600;
  font-size: var(--fs-400);
  letter-spacing: 0.02em;
  text-transform: none;
  transition: transform var(--transition-fast), background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
  cursor: pointer;
  white-space: nowrap;
}
.btn:active { transform: scale(0.98); }
.btn--lg {
  padding: 1em 1.6em;
  font-size: var(--fs-500);
}
.btn--primary {
  background: var(--c-fg);
  color: var(--c-bg);
}
.btn--primary:hover {
  background: var(--c-gold);
}
.btn--gold {
  background: linear-gradient(135deg, var(--c-gold) 0%, var(--c-gold-bright) 100%);
  color: var(--c-bg);
  box-shadow: 0 8px 28px -8px rgba(212, 175, 55, 0.5);
}
.btn--gold:hover {
  box-shadow: 0 12px 36px -8px rgba(212, 175, 55, 0.7);
  transform: translateY(-1px);
}
.btn--ghost {
  background: transparent;
  color: var(--c-fg);
  border: 1px solid var(--c-line-strong);
}
.btn--ghost:hover {
  border-color: var(--c-gold);
  color: var(--c-gold);
}
</style>
