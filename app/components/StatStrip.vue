<script setup lang="ts">
defineProps<{
  items: Array<{ value: number; label?: string; prefix?: string; suffix?: string; decimals?: number; detail?: string }>
}>()
</script>

<template>
  <div class="strip">
    <StatCounter
      v-for="(item, i) in items"
      :key="i"
      :value="item.value"
      :label="item.label"
      :prefix="item.prefix"
      :suffix="item.suffix"
      :decimals="item.decimals"
      :detail="item.detail"
    />
  </div>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--s-6);
  padding-block: var(--s-5);
  border-block: 1px solid var(--c-line);
}
</style>
