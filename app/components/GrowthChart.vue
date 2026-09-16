<script setup lang="ts">
/**
 * Single-series growth chart. Deliberately one series: the values it is used for
 * (views in millions, followers in thousands) differ by orders of magnitude, and
 * putting them on one plot would need a second y-axis -- the one thing that
 * reliably misleads a reader. Two measures means two of these.
 *
 * No legend by design: with one series the title already names what is plotted,
 * so a box with a single swatch just restates it.
 */
interface Point { date: string; value: number }

const props = withDefaults(defineProps<{
  points: Point[]
  label: string
  /** Shown under the endpoint value, e.g. "sinds april". */
  caption?: string
  /** Formats a value for labels and tooltip. Defaults to compact notation. */
  format?: (n: number) => string
  /** Locale for date formatting in the tooltip and axis. */
  locale?: string
  tableLabel?: string
  /** Shown in the tooltip slot while nothing is hovered, so its height is reserved. */
  hintLabel?: string
}>(), {
  caption: '',
  locale: 'nl',
  tableLabel: 'Toon data',
  hintLabel: 'Beweeg over de grafiek voor een datum',
})

const W = 720
const H = 260
const PAD = { top: 18, right: 58, bottom: 26, left: 8 }

const fmt = (n: number) => (props.format ? props.format(n) : compact(n))
function compact(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e5 ? 0 : 1)}K`
  return String(n)
}

const clean = computed(() =>
  props.points.filter(p => p && Number.isFinite(p.value)).slice().sort((a, b) => a.date < b.date ? -1 : 1),
)

// Axis floor sits below the first value rather than at zero: this data is a
// cumulative total that starts in the millions, so anchoring at zero would
// flatten four months of growth into a straight line near the top.
const bounds = computed(() => {
  const vals = clean.value.map(p => p.value)
  if (!vals.length) return { min: 0, max: 1 }
  const lo = Math.min(...vals), hi = Math.max(...vals)
  const pad = (hi - lo) * 0.18 || hi * 0.1
  return { min: Math.max(0, lo - pad), max: hi + pad * 0.4 }
})

const x = (i: number) => {
  const n = clean.value.length
  const span = W - PAD.left - PAD.right
  return PAD.left + (n <= 1 ? span / 2 : (i / (n - 1)) * span)
}
const y = (v: number) => {
  const { min, max } = bounds.value
  const span = H - PAD.top - PAD.bottom
  return PAD.top + span - ((v - min) / (max - min || 1)) * span
}

const linePath = computed(() =>
  clean.value.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(' '),
)
const areaPath = computed(() => {
  if (!clean.value.length) return ''
  const base = H - PAD.bottom
  return `${linePath.value} L${x(clean.value.length - 1).toFixed(2)},${base} L${x(0).toFixed(2)},${base} Z`
})

// Four gridlines, snapped to round numbers so the ticks carry the values that
// are not directly labelled.
const ticks = computed(() => {
  const { min, max } = bounds.value
  const step = niceStep((max - min) / 3)
  const out: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) out.push(v)
  return out
})
function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n >= 5 ? 5 : n >= 2 ? 2 : 1) * mag
}

const first = computed(() => clean.value[0])
const last = computed(() => clean.value[clean.value.length - 1])
const growthPct = computed(() => {
  if (!first.value || !last.value || !first.value.value) return null
  return Math.round(((last.value.value - first.value.value) / first.value.value) * 100)
})

const monthTicks = computed(() => {
  const seen = new Set<string>()
  const out: { i: number; label: string }[] = []
  clean.value.forEach((p, i) => {
    const m = p.date.slice(0, 7)
    if (seen.has(m)) return
    seen.add(m)
    out.push({ i, label: new Date(p.date).toLocaleDateString(props.locale, { month: 'short' }) })
  })
  return out.slice(1) // the first month sits on the left edge; skip to avoid a clipped label
})

const hoverIndex = ref<number | null>(null)
const svgEl = ref<SVGSVGElement | null>(null)

function onMove(e: PointerEvent) {
  const el = svgEl.value
  if (!el || !clean.value.length) return
  const box = el.getBoundingClientRect()
  const px = ((e.clientX - box.left) / box.width) * W
  const span = W - PAD.left - PAD.right
  const ratio = (px - PAD.left) / span
  hoverIndex.value = Math.max(0, Math.min(clean.value.length - 1, Math.round(ratio * (clean.value.length - 1))))
}
const hovered = computed(() => hoverIndex.value == null ? null : clean.value[hoverIndex.value])
const longDate = (d: string) =>
  new Date(d).toLocaleDateString(props.locale, { day: 'numeric', month: 'long', year: 'numeric' })

const gradientId = useId()
</script>

<template>
  <figure v-if="clean.length" class="growth">
    <figcaption class="growth__head">
      <span class="growth__label">{{ label }}</span>
      <span class="growth__value">{{ fmt(last.value) }}</span>
      <span v-if="growthPct !== null" class="growth__delta">+{{ growthPct }}%</span>
      <span v-if="caption" class="growth__caption">{{ caption }}</span>
    </figcaption>

    <svg
      ref="svgEl"
      class="growth__svg"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="`${label}: ${fmt(first.value)} → ${fmt(last.value)}`"
      @pointermove="onMove"
      @pointerleave="hoverIndex = null"
    >
      <defs>
        <linearGradient :id="gradientId" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--c-gold)" stop-opacity="0.22" />
          <stop offset="100%" stop-color="var(--c-gold)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <line
        v-for="t in ticks"
        :key="`g${t}`"
        class="growth__grid"
        :x1="PAD.left" :x2="W - PAD.right" :y1="y(t)" :y2="y(t)"
      />
      <text
        v-for="t in ticks"
        :key="`l${t}`"
        class="growth__tick"
        :x="W - PAD.right + 8" :y="y(t)" dominant-baseline="middle"
      >{{ fmt(t) }}</text>

      <text
        v-for="m in monthTicks"
        :key="`m${m.i}`"
        class="growth__tick"
        :x="x(m.i)" :y="H - 8" text-anchor="middle"
      >{{ m.label }}</text>

      <path class="growth__area" :d="areaPath" :fill="`url(#${gradientId})`" />
      <path class="growth__line" :d="linePath" />

      <template v-if="hovered && hoverIndex !== null">
        <line class="growth__crosshair" :x1="x(hoverIndex)" :x2="x(hoverIndex)" :y1="PAD.top" :y2="H - PAD.bottom" />
        <circle class="growth__hoverdot" :cx="x(hoverIndex)" :cy="y(hovered.value)" r="5" />
      </template>

      <circle class="growth__enddot" :cx="x(clean.length - 1)" :cy="y(last.value)" r="5" />
    </svg>

    <!-- Always rendered, only hidden: toggling it with v-if would reflow
         everything below it on every pointer move across the chart. -->
    <output class="growth__tip" :class="{ 'is-empty': !hovered }" aria-live="off">
      <template v-if="hovered">
        <span class="growth__tip-date">{{ longDate(hovered.date) }}</span>
        <span class="growth__tip-value">{{ fmt(hovered.value) }}</span>
      </template>
      <span v-else class="growth__tip-hint">{{ hintLabel }}</span>
    </output>

    <details class="growth__table">
      <summary>{{ tableLabel }}</summary>
      <table>
        <thead><tr><th scope="col">Datum</th><th scope="col">{{ label }}</th></tr></thead>
        <tbody>
          <tr v-for="p in clean" :key="p.date">
            <td>{{ p.date }}</td>
            <td>{{ p.value.toLocaleString(locale) }}</td>
          </tr>
        </tbody>
      </table>
    </details>
  </figure>
</template>

<style scoped>
.growth {
  margin: 0;
}

.growth__head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-3);
  margin-bottom: var(--s-3);
}

.growth__label {
  color: var(--c-fg-muted);
  font-size: var(--fs-300);
}

/* Text wears ink tokens, never the series colour — the gold line carries
   identity, the number stays legible. */
.growth__value {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-700);
  color: var(--c-fg);
  line-height: 1;
}

.growth__delta {
  font-family: var(--ff-display);
  font-weight: 700;
  font-size: var(--fs-500);
  color: var(--c-gold);
}

.growth__caption {
  color: var(--c-fg-muted);
  font-size: var(--fs-300);
  opacity: 0.8;
}

/* Uniform scaling: the viewBox aspect is mirrored here so the SVG fills the
   width without preserveAspectRatio="none", which would stretch x and turn the
   end-marker circle into an ellipse and skew the tick text. */
.growth__svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 720 / 260;
  overflow: visible;
  touch-action: pan-y;
}

.growth__grid {
  stroke: var(--c-line);
  stroke-width: 1;
}

.growth__tick {
  fill: var(--c-fg-muted);
  font-size: 11px;
  opacity: 0.75;
}

.growth__line {
  fill: none;
  stroke: var(--c-gold);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

/* Draws itself in on first paint. Gated below for reduced-motion. */
@media (prefers-reduced-motion: no-preference) {
  .growth__line {
    stroke-dasharray: 2400;
    stroke-dashoffset: 2400;
    animation: growth-draw 1.6s var(--transition-slow, ease-out) forwards;
  }
  .growth__area {
    opacity: 0;
    animation: growth-fade 1.1s 0.5s ease-out forwards;
  }
}

@keyframes growth-draw { to { stroke-dashoffset: 0 } }
@keyframes growth-fade { to { opacity: 1 } }

/* 2px ring in the surface colour so the marker stays legible where it meets
   the line — a stroke around the mark, not a border on it. */
.growth__enddot,
.growth__hoverdot {
  fill: var(--c-gold);
  stroke: var(--c-bg-elev-1);
  stroke-width: 2;
}

.growth__hoverdot {
  fill: var(--c-gold-bright);
}

.growth__crosshair {
  stroke: var(--c-fg-muted);
  stroke-width: 1;
  opacity: 0.35;
}

.growth__tip {
  display: flex;
  gap: var(--s-2);
  align-items: baseline;
  min-height: 1.5em;
  margin-top: var(--s-2);
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
}

.growth__tip-hint {
  opacity: 0.5;
}

/* The hint is decoration; hide it from touch users, who cannot hover. */
@media (hover: none) {
  .growth__tip.is-empty {
    visibility: hidden;
  }
}

.growth__tip-value {
  font-family: var(--ff-display);
  font-weight: 700;
  color: var(--c-fg);
}

.growth__table {
  margin-top: var(--s-3);
  font-size: var(--fs-300);
  color: var(--c-fg-muted);
}

.growth__table summary {
  cursor: pointer;
  opacity: 0.8;
}

.growth__table table {
  margin-top: var(--s-2);
  max-height: 14rem;
  overflow: auto;
  display: block;
  border-collapse: collapse;
}

.growth__table th,
.growth__table td {
  text-align: left;
  padding: 0.15rem var(--s-3) 0.15rem 0;
  font-variant-numeric: tabular-nums;
}
</style>
