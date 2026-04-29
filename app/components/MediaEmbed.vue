<script setup lang="ts">
const props = defineProps<{
  url: string
  title?: string
  ratio?: string
}>()

const embed = computed(() => useEmbed(props.url))
const root = ref<HTMLElement | null>(null)
const inView = ref(false)

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    inView.value = true
    return
  }
  const obs = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        inView.value = true
        obs.disconnect()
      }
    }
  }, { rootMargin: '200px' })
  obs.observe(root.value)
  onBeforeUnmount(() => obs.disconnect())
})
</script>

<template>
  <div
    ref="root"
    class="media"
    :style="{ '--ratio': ratio || '16/9' }"
  >
    <template v-if="inView && embed.embedUrl">
      <iframe
        :src="embed.embedUrl"
        :title="title || `${embed.kind} video`"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        loading="lazy"
        class="media__frame"
      />
    </template>
    <template v-else-if="embed.thumb">
      <img :src="embed.thumb" :alt="title || ''" class="media__poster">
    </template>
    <template v-else>
      <div class="media__fallback">{{ title || 'Video' }}</div>
    </template>
  </div>
</template>

<style scoped>
.media {
  position: relative;
  aspect-ratio: var(--ratio);
  background: var(--c-bg-elev-2);
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--c-line);
}
.media__frame,
.media__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.media__poster {
  object-fit: cover;
}
.media__fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: var(--c-fg-dim);
  font-size: var(--fs-300);
}
</style>
