<script setup lang="ts">
withDefaults(defineProps<{
  copyright?: string
  tagline?: string
}>(), {})
</script>

<template>
  <footer class="footer">
    <div class="container footer__inner">
      <div class="footer__brand">
        <slot name="brand">
          <span class="footer__monogram">DW</span>
        </slot>
        <p v-if="tagline" class="footer__tagline">{{ tagline }}</p>
      </div>

      <div v-if="$slots.nav" class="footer__col footer__col--nav">
        <p class="footer__heading">{{ $slots.navHeading ? '' : 'Navigatie' }}<slot name="navHeading" /></p>
        <ul class="footer__list"><slot name="nav" /></ul>
      </div>

      <div v-if="$slots.socials" class="footer__col footer__col--socials">
        <p class="footer__heading"><slot name="socialsHeading">Socials</slot></p>
        <ul class="footer__list"><slot name="socials" /></ul>
      </div>
    </div>

    <div class="container footer__base">
      <p v-if="copyright" class="footer__copy">{{ copyright }}</p>
      <p class="footer__legal">
        <slot name="legal" />
      </p>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--c-line);
  padding-block: var(--s-7);
  background: var(--c-bg);
  position: relative;
}
.footer__inner {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--s-7);
  padding-bottom: var(--s-6);
}
@media (min-width: 720px) {
  .footer__inner { grid-template-columns: 1.4fr 1fr 1fr; gap: var(--s-7); }
}
.footer__brand {
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  align-items: flex-start;
  max-width: 26rem;
}
.footer__monogram {
  font-family: var(--ff-display);
  font-weight: 800;
  color: var(--c-fg);
  font-size: var(--fs-500);
}
.footer__tagline {
  font-family: var(--ff-display);
  font-style: italic;
  font-size: var(--fs-500);
  color: var(--c-fg-soft);
  line-height: var(--lh-snug);
  margin: 0;
}

.footer__col {
  display: flex;
  flex-direction: column;
  gap: var(--s-3);
}
.footer__heading {
  font-family: var(--ff-body);
  font-size: var(--fs-300);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: var(--tracking-wide);
  color: var(--c-fg-soft);
  margin: 0;
}
.footer__list {
  display: flex;
  flex-direction: column;
  gap: var(--s-2);
  list-style: none;
  margin: 0;
  padding: 0;
}
.footer__list :deep(a) {
  color: var(--c-fg-muted);
  text-decoration: none;
  font-size: var(--fs-400);
  transition: color var(--transition-fast);
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
}
.footer__list :deep(a:hover) { color: var(--c-gold); }

.footer__base {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding-top: var(--s-5);
  border-top: 1px solid var(--c-line);
}
.footer__copy,
.footer__legal {
  font-size: var(--fs-300);
  color: var(--c-fg-dim);
  letter-spacing: var(--tracking-wide);
  margin: 0;
}
.footer__legal :deep(a) {
  color: var(--c-fg-muted);
  text-decoration: underline;
  text-decoration-color: var(--c-line-strong);
  text-underline-offset: 3px;
  transition: color var(--transition-fast);
}
.footer__legal :deep(a:hover) { color: var(--c-gold); }
</style>
