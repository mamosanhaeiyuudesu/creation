<template>
  <div class="flex items-stretch gap-1">
    <!-- Y軸の下限・上限（切りの良い数値）を左に表示 -->
    <div class="flex flex-col justify-between text-[8px] leading-none text-slate-600 tabular-nums shrink-0 text-right">
      <span>{{ fmtBound(axis.hi) }}</span>
      <span>{{ fmtBound(axis.lo) }}</span>
    </div>
    <div ref="wrap" class="relative flex-1 min-w-0" @pointermove="onMove" @pointerleave="hover = -1">
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
        <line v-if="goalY != null" :x1="0" :x2="100" :y1="goalY" :y2="goalY" stroke="#f8fafc" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="3 2" vector-effect="non-scaling-stroke" />
        <line v-if="zeroY != null" :x1="0" :x2="100" :y1="zeroY" :y2="zeroY" stroke="#cbd5e1" stroke-opacity="0.5" stroke-width="1" vector-effect="non-scaling-stroke" />
        <line v-if="hoverX != null" :x1="hoverX" :x2="hoverX" :y1="0" :y2="h" :stroke="color" stroke-opacity="0.4" stroke-width="1" vector-effect="non-scaling-stroke" />
      </svg>
      <div
        v-if="hover >= 0 && hovered"
        class="pointer-events-none absolute z-50 px-1.5 py-0.5 rounded-md bg-slate-900/95 border border-white/10 text-[10px] text-slate-100 whitespace-nowrap -translate-x-1/2 -translate-y-full shadow-lg"
        :style="{ left: `${hoverFrac * 100}%`, top: '-2px' }"
      >
        <span class="text-slate-400">{{ mdWeekday(hovered.date) }}</span>
        <span class="ml-1 font-semibold tabular-nums">{{ hovered.value ?? '-' }}{{ unit }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { mdWeekday } from '~/utils/jst'
import { niceAxis } from '~/composables/fitbit/useBarChart'

interface Pt { date: string; value: number | null }

const props = withDefaults(defineProps<{
  points: Pt[]
  color?: string
  h?: number
  unit?: string
  zeroBased?: boolean
  decimals?: number
  axisRange?: readonly [number, number]
  goal?: number
  zeroLine?: boolean
}>(), { color: '#38bdf8', h: 30, unit: '', zeroBased: false, decimals: 0 })

function fmtBound(v: number): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: props.decimals, maximumFractionDigits: props.decimals })
}

const wrap = ref<HTMLElement>()
const hover = ref(-1)

const vals = computed(() => props.points.map(p => p.value))
const nums = computed(() => vals.value.filter((v): v is number => v != null))
const min = computed(() => (nums.value.length ? Math.min(...nums.value) : 0))
const max = computed(() => (nums.value.length ? Math.max(...nums.value) : 0))

const bandWidth = computed(() => 100 / Math.max(1, props.points.length))
const barWidth = computed(() => bandWidth.value * 0.6)
const xFor = (i: number) => i * bandWidth.value + (bandWidth.value - barWidth.value) / 2
// 軸は「切りの良い」下限・上限に丸める（range 固定 / zeroBased は下限0）。goal は必ず軸内に収まるよう上限計算に含める。
const effMax = computed(() => (props.goal != null ? Math.max(max.value, props.goal) : max.value))
const axis = computed(() => niceAxis(min.value, effMax.value, { zeroBased: props.zeroBased, range: props.axisRange }))
const topPad = 2
// 値 → y座標（上端 topPad, 下端 props.h）
const yFor = (v: number) => {
  const span = axis.value.hi - axis.value.lo || 1
  return topPad + (1 - (v - axis.value.lo) / span) * (props.h - topPad)
}
const goalY = computed(() => (props.goal != null ? yFor(props.goal) : null))
// 基準線（0）。皮膚温の変動など「差」を見せる指標で、正負の境目をはっきり示すために使う。
const zeroY = computed(() => (props.zeroLine && axis.value.lo <= 0 && axis.value.hi >= 0 ? yFor(0) : null))
// 基準線は0（軸内にクランプ）。0が軸内なら負値は下・正値は上に伸びる。
const baseY = computed(() => yFor(Math.min(axis.value.hi, Math.max(axis.value.lo, 0))))

const bars = computed(() =>
  props.points.map((p, i) => {
    if (p.value == null) return { x: xFor(i), y: props.h, height: 0 }
    const yv = yFor(p.value)
    const y0 = baseY.value
    return { x: xFor(i), y: Math.min(y0, yv), height: Math.max(Math.abs(yv - y0), 0.8) }
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
