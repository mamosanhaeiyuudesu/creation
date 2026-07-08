<template>
  <div ref="wrap" class="relative" @pointermove="onMove" @pointerleave="hover = -1">
    <svg :viewBox="`0 0 100 ${h}`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${h}px` }">
      <polygon v-if="area" :points="area" :fill="color" fill-opacity="0.10" />
      <polyline
        v-if="line"
        :points="line"
        fill="none"
        :stroke="color"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
      />
      <line v-if="hoverX != null" :x1="hoverX" :x2="hoverX" :y1="0" :y2="h" :stroke="color" stroke-opacity="0.4" stroke-width="1" vector-effect="non-scaling-stroke" />
      <circle v-if="hoverPt" :cx="hoverPt[0]" :cy="hoverPt[1]" :r="2" :fill="color" vector-effect="non-scaling-stroke" />
      <circle v-else-if="last" :cx="last[0]" :cy="last[1]" :r="1.6" :fill="color" vector-effect="non-scaling-stroke" />
    </svg>
    <div
      v-if="hover >= 0 && hovered"
      class="pointer-events-none absolute z-50 px-1.5 py-0.5 rounded-md bg-slate-900/95 border border-white/10 text-[10px] text-slate-100 whitespace-nowrap -translate-x-1/2 -translate-y-full shadow-lg"
      :style="{ left: `${hoverFrac * 100}%`, top: '-2px' }"
    >
      <span class="text-slate-400">{{ hovered.date.slice(5).replace('-', '/') }}</span>
      <span class="ml-1 font-semibold tabular-nums">{{ hovered.value ?? '-' }}{{ unit }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Pt { date: string; value: number | null }

const props = withDefaults(defineProps<{
  points: Pt[]
  color?: string
  h?: number
  unit?: string
}>(), { color: '#38bdf8', h: 30, unit: '' })

const wrap = ref<HTMLElement>()
const hover = ref(-1)

const vals = computed(() => props.points.map(p => p.value))
const nums = computed(() => vals.value.filter((v): v is number => v != null))
const min = computed(() => (nums.value.length ? Math.min(...nums.value) : 0))
const max = computed(() => (nums.value.length ? Math.max(...nums.value) : 0))

const xFor = (i: number) => (props.points.length > 1 ? (i / (props.points.length - 1)) * 100 : 50)
const yFor = (v: number) => {
  const span = max.value - min.value || 1
  const pad = 2
  return props.h - pad - ((v - min.value) / span) * (props.h - pad * 2)
}

const coords = computed(() => {
  const out: [number, number][] = []
  props.points.forEach((p, i) => { if (p.value != null) out.push([xFor(i), yFor(p.value)]) })
  return out
})
const line = computed(() => coords.value.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' '))
const area = computed(() => {
  if (coords.value.length < 2) return ''
  return `${coords.value[0][0]},${props.h} ${line.value} ${coords.value[coords.value.length - 1][0]},${props.h}`
})
const last = computed(() => coords.value[coords.value.length - 1] ?? null)

const hovered = computed(() => (hover.value >= 0 ? props.points[hover.value] : null))
const hoverFrac = computed(() => (hover.value >= 0 ? xFor(hover.value) / 100 : 0))
const hoverX = computed(() => (hover.value >= 0 ? xFor(hover.value) : null))
const hoverPt = computed(() => {
  const h = hovered.value
  return h && h.value != null ? [xFor(hover.value), yFor(h.value)] as [number, number] : null
})

function onMove(e: PointerEvent) {
  const el = wrap.value
  if (!el || props.points.length < 2) return
  const rect = el.getBoundingClientRect()
  const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  hover.value = Math.round(frac * (props.points.length - 1))
}
</script>
