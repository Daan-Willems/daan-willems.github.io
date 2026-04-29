<script setup lang="ts">
defineProps<{
  quote: string
  author?: string
  role?: string
}>()
</script>

<template>
  <figure class="quote">
    <span class="quote__mark" aria-hidden="true">&ldquo;</span>
    <blockquote class="quote__body">
      {{ quote }}
    </blockquote>
    <figcaption v-if="author" class="quote__cite">
      <span class="quote__author">{{ author }}</span>
      <span v-if="role" class="quote__role">{{ role }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.quote {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: var(--s-4);
  padding: var(--s-6) var(--s-5) var(--s-5);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: border-color var(--transition-base), transform var(--transition-base);
}
.quote::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, var(--c-fg) 0%, transparent 60%);
  transition: background var(--transition-base);
}
.quote:hover::before {
  background: linear-gradient(180deg, var(--c-gold) 0%, transparent 60%);
}
.quote:hover {
  border-color: var(--c-gold-deep);
  transform: translateY(-2px);
}
.quote__mark {
  position: absolute;
  top: -0.4em;
  right: 0.1em;
  font-family: var(--ff-display);
  font-size: 9rem;
  line-height: 1;
  color: var(--c-fg);
  opacity: 0.12;
  pointer-events: none;
}
.quote__body {
  font-family: var(--ff-display);
  font-style: italic;
  font-size: var(--fs-500);
  line-height: var(--lh-snug);
  color: var(--c-fg);
  margin: 0;
  position: relative;
}
.quote__cite {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: var(--s-3);
  border-top: 1px solid var(--c-line);
}
.quote__author {
  font-weight: 600;
  color: var(--c-fg);
  font-size: var(--fs-400);
}
.quote__role {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-dim);
}
</style>
