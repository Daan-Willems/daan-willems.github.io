<script setup lang="ts">
defineProps<{
  id?: string
  eyebrow?: string
  title?: string
  intro?: string
  align?: 'start' | 'center'
  tone?: 'default' | 'elevated'
}>()
</script>

<template>
  <section
    :id="id"
    :data-progress-id="id"
    class="section"
    :class="[`section--${tone || 'default'}`, `section--${align || 'start'}`]"
  >
    <div class="container">
      <header v-if="eyebrow || title || intro || $slots.header" class="section__header">
        <slot name="header">
          <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
          <h2 v-if="title" class="section__title">{{ title }}</h2>
          <p v-if="intro" class="section__intro">{{ intro }}</p>
        </slot>
      </header>
      <div class="section__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.section {
  padding-block: var(--s-9);
  position: relative;
}
.section--elevated {
  background: var(--c-bg-elev-1);
  border-block: 1px solid var(--c-line);
}
.section__header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--s-4);
  margin-bottom: var(--s-7);
  max-width: 56rem;
}
.section--center .section__header {
  margin-inline: auto;
  align-items: center;
  text-align: center;
}
.section__title {
  font-size: var(--fs-800);
  line-height: var(--lh-tight);
}
.section__intro {
  font-size: var(--fs-500);
  color: var(--c-fg-muted);
  line-height: var(--lh-snug);
  white-space: pre-line;
}
@media (max-width: 640px) {
  .section { padding-block: var(--s-8); }
  .section__title { font-size: var(--fs-700); }
}
</style>
