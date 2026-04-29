<script setup lang="ts">
const props = defineProps<{
  kind: 'tel' | 'mailto' | 'whatsapp' | 'sms' | 'url'
  value: string
  label?: string
  hint?: string
  subject?: string
  body?: string
  icon?: string
}>()

const href = computed(() => {
  switch (props.kind) {
    case 'tel':
      return `tel:${props.value.replace(/[^\d+]/g, '')}`
    case 'sms':
      return `sms:${props.value.replace(/[^\d+]/g, '')}`
    case 'mailto': {
      const params: string[] = []
      if (props.subject) params.push(`subject=${encodeURIComponent(props.subject)}`)
      if (props.body) params.push(`body=${encodeURIComponent(props.body)}`)
      const qs = params.length ? `?${params.join('&')}` : ''
      return `mailto:${props.value}${qs}`
    }
    case 'whatsapp': {
      const num = props.value.replace(/[^\d]/g, '')
      const text = props.body ? `?text=${encodeURIComponent(props.body)}` : ''
      return `https://wa.me/${num}${text}`
    }
    case 'url':
    default:
      return props.value
  }
})

const isExternal = computed(() => props.kind === 'whatsapp' || props.kind === 'url')
</script>

<template>
  <a
    :href="href"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener' : undefined"
    class="tile"
  >
    <div v-if="icon" class="tile__icon" aria-hidden="true">{{ icon }}</div>
    <div class="tile__body">
      <div v-if="label" class="tile__label">{{ label }}</div>
      <div class="tile__value">{{ value }}</div>
      <div v-if="hint" class="tile__hint">{{ hint }}</div>
    </div>
    <div class="tile__arrow" aria-hidden="true">→</div>
  </a>
</template>

<style scoped>
.tile {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4) var(--s-5);
  background: var(--c-bg-elev-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  transition: transform var(--transition-base), border-color var(--transition-base), background var(--transition-base);
  min-width: 0;
  overflow: hidden;
}
.tile:hover {
  transform: translateY(-2px);
  border-color: var(--c-gold-deep);
  background: var(--c-bg-elev-1);
}
.tile__icon {
  font-size: 1.4rem;
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  background: rgba(245, 241, 232, 0.06);
  border-radius: 50%;
  color: var(--c-fg);
  flex-shrink: 0;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.tile:hover .tile__icon {
  background: rgba(212, 175, 55, 0.16);
  color: var(--c-gold);
}
.tile__body { flex: 1; min-width: 0; }
.tile__label {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-dim);
  margin-bottom: 2px;
}
.tile__value {
  font-family: var(--ff-display);
  font-weight: 600;
  font-size: var(--fs-400);
  color: var(--c-fg);
  word-break: break-word;
  overflow-wrap: anywhere;
}
.tile__arrow { flex-shrink: 0; }
.tile__hint {
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
  margin-top: 2px;
}
.tile__arrow {
  color: var(--c-fg-dim);
  transition: color var(--transition-fast), transform var(--transition-fast);
}
.tile:hover .tile__arrow {
  color: var(--c-gold);
  transform: translateX(4px);
}
</style>
