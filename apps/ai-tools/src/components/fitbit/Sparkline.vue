<template>
  <div ref="wrap" class="relative" @pointermove="onMove" @pointerleave="hover = -1">
    <svg :viewBox="`0 0 100 ${h}`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${h}px` }">
      <rect
        v-for="(b, i) in bars"
        :key="i"
        :x="b.x"
        :y="b.y"
        :width="barWidth"
        :height="b.height"
        :fill="color"
        :fill-opacity="hover === i ? 1 : 0.55"
        rx="0.8"
      />
      <line v-if="hoverX != null" :x1="hoverX" :x2="hoverX" :y1="0" :y2="h" :stroke="color" stroke-opacity="0.4" stroke-width="1" vector-effect="non-scaling-stroke" />
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

const bandWidth = computed(() => 100 / Math.max(1, props.points.length))
const barWidth = computed(() => bandWidth.value * 0.6)
const xFor = (i: number) => i * bandWidth.value + (bandWidth.value - barWidth.value) / 2
const heightFor = (v: number) => {
  const span = max.value - min.value || 1
  const topPad = 2
  return Math.max(((v - min.value) / span) * (props.h - topPad), 1.5)
}

const bars = computed(() =>
  props.points.map((p, i) => {
    const height = p.value != null ? heightFor(p.value) : 0
    return { x: xFor(i), y: props.h - height, height }
  }),
)

const hovered = computed(() => (hover.value >= 0 ? props.points[hover.value] : null))
const hoverCenter = (i: number) => i * bandWidth.value + bandWidth.value / 2
const hoverFrac = computed(() => (hover.value >= 0 ? hoverCenter(hover.value) / 100 : 0))
const hoverX = computed(() => (hover.value >= 0 ? hoverCenter(hover.value) : null))

function onMove(e: PointerEvent) {
  const el = wrap.value
  if (!el || props.points.length < 2) return
  const rect = el.getBoundingClientRect()
  const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  hover.value = Math.round(frac * (props.points.length - 1))
}
</script>
