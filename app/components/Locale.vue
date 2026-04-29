<script setup lang="ts">
import { useI18n } from '#imports'

const props = defineProps<{ lang: string }>()
const { locale } = useI18n()
const show = computed(() => locale.value === props.lang)
</script>

<template>
  <template v-if="show">
    <slot />
  </template>
</template>
