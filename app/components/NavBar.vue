<script setup lang="ts">
interface NavItem {
  href: string
  label: string
}

defineProps<{
  items: NavItem[]
  brand?: string
}>()

const scrolled = ref(false)
const open = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 24
}

function close() { open.value = false }
function toggle() { open.value = !open.value }

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) close()
}

watch(open, (v) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = v ? 'hidden' : ''
})

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>

<template>
  <header class="nav" :class="{ 'is-scrolled': scrolled, 'is-open': open }">
    <div class="container nav__inner">
      <a href="#top" class="nav__brand" :aria-label="brand || 'Home'" @click="close">
        <slot name="brand">
          <span class="nav__monogram">DW</span>
        </slot>
      </a>
      <nav class="nav__menu" aria-label="Primary">
        <a
          v-for="item in items"
          :key="item.href"
          :href="item.href"
          class="nav__link"
        >{{ item.label }}</a>
      </nav>
      <div class="nav__trail">
        <slot name="trail" />
        <button
          type="button"
          class="nav__burger"
          :aria-expanded="open"
          aria-controls="nav-sheet"
          aria-label="Menu"
          @click="toggle"
        >
          <span /><span /><span />
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        id="nav-sheet"
        class="nav__sheet"
        :class="{ 'is-visible': open }"
        :aria-hidden="!open"
        @click.self="close"
      >
        <nav class="nav__sheet-menu" aria-label="Mobile">
          <a
            v-for="item in items"
            :key="item.href"
            :href="item.href"
            class="nav__sheet-link"
            @click="close"
          >{{ item.label }}</a>
        </nav>
      </div>
    </Teleport>
  </header>
</template>

<style scoped>
.nav {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: var(--z-nav);
  padding-block: var(--s-4);
  transition: background var(--transition-base), backdrop-filter var(--transition-base), border-color var(--transition-base);
  border-bottom: 1px solid transparent;
}
.nav.is-scrolled,
.nav.is-open {
  background: rgba(10, 9, 8, 0.7);
  backdrop-filter: saturate(180%) blur(14px);
  border-bottom-color: var(--c-line);
}
.nav__inner {
  display: flex;
  align-items: center;
  gap: var(--s-5);
  position: relative;
  z-index: 2;
}
.nav__brand {
  display: inline-flex;
  align-items: center;
  margin-right: auto;
}
.nav__monogram {
  font-family: var(--ff-display);
  font-weight: 800;
  font-size: var(--fs-600);
  letter-spacing: var(--tracking-tight);
  color: var(--c-fg);
}
.nav__menu {
  display: none;
  gap: var(--s-5);
}
.nav__link {
  font-size: var(--fs-300);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  color: var(--c-fg-muted);
  transition: color var(--transition-fast);
}
.nav__link:hover {
  color: var(--c-fg);
}
.nav__trail {
  display: flex;
  align-items: center;
  gap: var(--s-3);
}

.nav__burger {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.nav__burger:hover {
  border-color: var(--c-gold);
  background: rgba(212, 175, 55, 0.08);
}
.nav__burger span {
  position: absolute;
  left: 11px;
  right: 11px;
  height: 2px;
  background: var(--c-fg);
  border-radius: 2px;
  transition: transform var(--transition-fast), opacity var(--transition-fast), top var(--transition-fast);
}
.nav__burger span:nth-child(1) { top: 14px; }
.nav__burger span:nth-child(2) { top: 21px; }
.nav__burger span:nth-child(3) { top: 28px; }
.nav.is-open .nav__burger span:nth-child(1) {
  top: 21px;
  transform: rotate(45deg);
}
.nav.is-open .nav__burger span:nth-child(2) {
  opacity: 0;
}
.nav.is-open .nav__burger span:nth-child(3) {
  top: 21px;
  transform: rotate(-45deg);
}

.nav__sheet {
  position: fixed;
  inset: 0;
  background: rgba(10, 9, 8, 0.96);
  backdrop-filter: saturate(180%) blur(20px);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition-base);
  z-index: 1;
}
.nav__sheet.is-visible {
  opacity: 1;
  pointer-events: auto;
}
.nav__sheet-menu {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--s-5);
  height: 100%;
  padding: var(--s-7) var(--s-5);
}
.nav__sheet-link {
  font-family: var(--ff-display);
  font-size: var(--fs-700);
  letter-spacing: var(--tracking-tight);
  color: var(--c-fg);
  text-decoration: none;
  transition: color var(--transition-fast);
}
.nav__sheet-link:hover { color: var(--c-gold); }

@media (min-width: 768px) {
  .nav__menu { display: flex; }
  .nav__burger { display: none; }
  .nav__sheet { display: none; }
}
</style>
