<script setup lang="ts">
import { useI18n } from '#imports'

const { locale, locales, setLocale } = useI18n()
const list = computed(() => (locales.value as Array<{ code: string; name: string }>).map(l => ({ code: l.code, name: l.name })))
</script>

<template>
  <div class="lang" role="group" aria-label="Language">
    <button
      v-for="l in list"
      :key="l.code"
      type="button"
      class="lang__btn"
      :class="{ 'is-active': locale === l.code }"
      :aria-pressed="locale === l.code"
      @click="setLocale(l.code as any)"
    >{{ l.code.toUpperCase() }}</button>
  </div>
</template>

<style scoped>
.lang {
  display: inline-flex;
  gap: 1px;
  padding: 2px;
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius-pill);
  background: rgba(28, 25, 23, 0.5);
}
.lang__btn {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--tracking-wide);
  padding: 6px 10px;
  border-radius: var(--radius-pill);
  color: var(--c-fg-muted);
  transition: color var(--transition-fast), background var(--transition-fast);
}
.lang__btn:hover { color: var(--c-fg); }
.lang__btn.is-active {
  color: var(--c-bg);
  background: var(--c-gold);
}
</style>
