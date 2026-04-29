<script setup lang="ts">
import logoMark from '~/assets/images/logo-mark.svg?raw'
import logoFull from '~/assets/images/logo-full.svg?raw'

withDefaults(defineProps<{
  variant?: 'mark' | 'full' | 'responsive'
  title?: string
}>(), {
  variant: 'responsive',
  title: 'Daan Willems',
})
</script>

<template>
  <span class="brand" :class="`brand--${variant}`" role="img" :aria-label="title">
    <span v-if="variant === 'mark' || variant === 'responsive'" class="brand__mark" v-html="logoMark" />
    <span v-if="variant === 'full' || variant === 'responsive'" class="brand__full" v-html="logoFull" />
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  color: var(--c-fg);
  line-height: 1;
  transition: color var(--transition-fast);
}
.brand:hover { color: var(--c-gold); }
.brand__mark,
.brand__full {
  display: inline-flex;
  align-items: center;
  height: 100%;
}
.brand :deep(svg) {
  display: block;
  height: 100%;
  width: auto;
}

.brand--mark {
  height: 2.75rem;
}
.brand--full {
  height: 4rem;
}

.brand--responsive {
  height: 2.75rem;
}
.brand--responsive .brand__full { display: none; }
.brand--responsive .brand__mark { display: inline-flex; }

@media (min-width: 768px) {
  .brand--responsive {
    height: 4rem;
  }
  .brand--responsive .brand__mark { display: none; }
  .brand--responsive .brand__full { display: inline-flex; }
}
</style>
