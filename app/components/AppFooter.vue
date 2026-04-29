<script setup lang="ts">
defineProps<{
  copyright?: string
  homeHref?: string
}>()
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <slot name="brand">
          <span class="footer__monogram">DW</span>
        </slot>
        <p v-if="copyright" class="footer__copy">{{ copyright }}</p>
      </div>
      <div class="footer__links">
        <slot />
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--c-line);
  padding-block: var(--s-7);
  background: var(--c-bg);
}
.footer__inner {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-5);
  align-items: center;
  justify-content: space-between;
}
.footer__brand {
  display: flex;
  align-items: baseline;
  gap: var(--s-4);
}
.footer__monogram {
  font-family: var(--ff-display);
  font-weight: 800;
  color: var(--c-fg);
  font-size: var(--fs-500);
}
.footer__copy {
  font-size: var(--fs-300);
  color: var(--c-fg-dim);
}
.footer__links {
  display: flex;
  gap: var(--s-4);
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
}
</style>
