<script setup lang="ts">
withDefaults(defineProps<{
  items: Array<{ url?: string; src?: string; alt?: string; href?: string; title?: string }>
  columns?: number
  gap?: string
}>(), {
  columns: 3,
  gap: 'var(--s-5)',
})
</script>

<template>
  <div
    class="grid"
    :style="{ '--cols': columns, '--gap': gap }"
  >
    <slot v-for="(item, i) in items" :item="item" :index="i">
      <component
        :is="item.href ? 'a' : 'div'"
        :key="i"
        :href="item.href"
        :target="item.href ? '_blank' : undefined"
        rel="noopener"
        class="grid__item"
      >
        <MediaEmbed v-if="item.url" :url="item.url" :title="item.title" />
        <img v-else-if="item.src" :src="item.src" :alt="item.alt || ''">
      </component>
    </slot>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols, 3), 1fr);
  gap: var(--gap, var(--s-5));
}
.grid__item {
  display: block;
  border-radius: var(--radius-md);
  overflow: hidden;
}
@media (max-width: 900px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: 1fr; }
}
</style>
