<script setup lang="ts">
const props = defineProps<{
  open: boolean
  title?: string
  closeLabel?: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

function close() {
  emit('update:open', false)
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

watch(() => props.open, (open) => {
  if (typeof document === 'undefined') return
  if (open) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKey)
  }
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
  document.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lb">
      <div
        v-if="open"
        class="lb"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
        @click.self="close"
      >
        <div class="lb__backdrop" @click="close" />
        <div class="lb__panel" role="document">
          <header class="lb__head">
            <h3 v-if="title" class="lb__title">{{ title }}</h3>
            <button
              type="button"
              class="lb__close"
              :aria-label="closeLabel || 'Sluiten'"
              @click="close"
            >
              <span aria-hidden="true">×</span>
            </button>
          </header>
          <div class="lb__body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lb {
  position: fixed;
  inset: 0;
  z-index: var(--z-lightbox);
  display: grid;
  place-items: center;
  padding: var(--s-5);
}
.lb__backdrop {
  position: absolute;
  inset: 0;
  background: var(--c-overlay);
  backdrop-filter: blur(8px);
}
.lb__panel {
  position: relative;
  width: min(100%, 56rem);
  max-height: calc(100vh - 4rem);
  background: var(--c-bg-elev-1);
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-soft);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.lb__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-4);
  padding: var(--s-5) var(--s-6);
  border-bottom: 1px solid var(--c-line);
}
.lb__title {
  font-family: var(--ff-display);
  font-size: var(--fs-600);
  font-weight: 600;
}
.lb__close {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 1.4rem;
  color: var(--c-fg-muted);
  transition: background var(--transition-fast), color var(--transition-fast);
}
.lb__close:hover {
  background: var(--c-bg-elev-2);
  color: var(--c-fg);
}
.lb__body {
  padding: var(--s-6);
  overflow-y: auto;
}

.lb-enter-active, .lb-leave-active {
  transition: opacity var(--transition-base);
}
.lb-enter-active .lb__panel, .lb-leave-active .lb__panel {
  transition: transform var(--transition-base);
}
.lb-enter-from, .lb-leave-to { opacity: 0; }
.lb-enter-from .lb__panel, .lb-leave-to .lb__panel {
  transform: scale(0.96) translateY(8px);
}
</style>
