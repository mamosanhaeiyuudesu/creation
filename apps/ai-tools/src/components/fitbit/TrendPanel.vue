<template>
  <div class="flex flex-col gap-3">
    <!-- 期間トグル -->
    <div class="flex items-center gap-1.5">
      <button
        v-for="opt in periods"
        :key="opt.days"
        class="px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer"
        :class="days === opt.days ? 'border-white/20 bg-white/10 text-slate-100' : 'border-white/[0.08] text-slate-500 hover:text-slate-300'"
        @click="setDays(opt.days)"
      >{{ opt.label }}</button>
    </div>

    <div v-if="loading" class="h-[180px] flex items-center justify-center text-slate-500 text-sm animate-pulse">読み込み中…</div>
    <div v-else-if="!hasData" class="h-[180px] flex items-center justify-center text-slate-600 text-sm">データがありません</div>

    <template v-else>
      <!-- 統計 -->
      <div class="flex items-center gap-5 text-xs">
        <div><span class="text-slate-500">平均</span> <span class="font-bold text-slate-100 tabular-nums">{{ fmt(avg) }}</span><span class="text-slate-500 text-[10px]">{{ unit }}</span></div>
        <div><span class="text-slate-500">最小</span> <span class="font-semibold text-slate-300 tabular-nums">{{ fmt(min) }}</span></div>
        <div><span class="text-slate-500">最大</span> <span class="font-semibold text-slate-300 tabular-nums">{{ fmt(max) }}</span></div>
      </div>

      <!-- 縦棒グラフ -->
      <div ref="wrap" class="relative" :style="{ height: `${H}px` }">
        <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none" class="w-full h-full block" @pointermove="onMove" @pointerleave="hover = -1">
          <!-- グリッド -->
          <line v-for="(gy, i) in gridYs" :key="`g${i}`" :x1="padL" :x2="W - padR" :y1="gy.y" :y2="gy.y" class="stroke-white/[0.06]" stroke-width="1" vector-effect="non-scaling-stroke" />
          <text v-for="(gy, i) in gridYs" :key="`t${i}`" :x="padL - 6" :y="gy.y + 3" text-anchor="end" class="fill-slate-600" :style="labelStyle">{{ fmt(gy.v) }}</text>
          <!-- 棒 -->
          <rect
            v-for="b in bars"
            :key="`b${b.i}`"
            :x="b.x"
            :y="b.y"
            :width="b.width"
            :height="b.height"
            rx="2"
            :fill="color"
            :fill-opacity="hover === b.i ? 1 : 0.7"
          />
          <!-- ホバーガイド -->
          <line v-if="hoverX != null" :x1="hoverX" :x2="hoverX" :y1="padT" :y2="H - padB" :stroke="color" stroke-opacity="0.35" stroke-width="1" stroke-dasharray="2 2" vector-effect="non-scaling-stroke" />
          <!-- X ラベル -->
          <text v-for="(lbl, i) in xLabels" :key="`x${i}`" :x="lbl.x" :y="H - 4" text-anchor="middle" class="fill-slate-600" :style="labelStyle">{{ lbl.text }}</text>
        </svg>
        <!-- ツールチップ -->
        <div
          v-if="hovered"
          class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900/95 border border-white/10 text-[11px] whitespace-nowrap -translate-x-1/2 shadow-lg"
          :style="tooltipStyle"
        >
          <div class="text-slate-400 text-[10px]">{{ hovered.date.slice(5).replace('-', '/') }}</div>
          <div class="font-bold text-slate-100 tabular-nums">{{ hovered.value ?? '-' }}<span class="text-slate-500 text-[10px] font-normal ml-0.5">{{ unit }}</span></div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { TrendData } from '~/types/fitbit'

const props = withDefaults(defineProps<{
  metric: string
  color?: string
  unit?: string
  date?: string
  decimals?: number
  defaultDays?: number
}>(), { color: '#38bdf8', unit: '', decimals: 0, defaultDays: 7 })

const periods = [
  { days: 7, label: '7日' },
  { days: 30, label: '1か月' },
  { days: 90, label: '3か月' },
]

const days = ref(props.defaultDays)
const series = ref<TrendData['days']>([])
const loading = ref(true)

const wrap = ref<HTMLElement>()
const W = ref(320) // 実ピクセル幅（viewBox=ピクセルなので歪みなし）
const H = 180
const padL = 34
const padR = 12
const padT = 12
const padB = 20
const hover = ref(-1)
// viewBox が実寸なので text は px 指定でも歪まないが、preserveAspectRatio=none のため font-size は明示
const labelStyle = { fontSize: '9px' } as const

const nums = computed(() => series.value.map(d => d.value).filter((v): v is number => v != null))
const hasData = computed(() => nums.value.length >= 2)
const min = computed(() => (nums.value.length ? Math.min(...nums.value) : 0))
const max = computed(() => (nums.value.length ? Math.max(...nums.value) : 0))
const avg = computed(() => (nums.value.length ? nums.value.reduce((a, b) => a + b, 0) / nums.value.length : 0))

function fmt(v: number): string { return v.toFixed(props.decimals) }

const yLo = computed(() => min.value - (max.value - min.value || 1) * 0.1)
const yHi = computed(() => max.value + (max.value - min.value || 1) * 0.1)

function toX(i: number): number {
  const n = series.value.length
  return padL + (n > 1 ? (i / (n - 1)) * (W.value - padL - padR) : (W.value - padL - padR) / 2)
}
function toY(v: number): number {
  const span = yHi.value - yLo.value || 1
  return padT + (1 - (v - yLo.value) / span) * (H - padT - padB)
}

const barWidth = computed(() => {
  const n = series.value.length
  if (!n) return 0
  const inner = W.value - padL - padR
  const slot = n > 1 ? inner / n : inner
  return Math.max(2, slot * 0.6)
})
const bars = computed(() => series.value
  .map((d, i) => {
    if (d.value == null) return null
    const base = H - padB
    const y = toY(d.value)
    return { i, x: toX(i) - barWidth.value / 2, y, width: barWidth.value, height: Math.max(0, base - y) }
  })
  .filter((b): b is { i: number; x: number; y: number; width: number; height: number } => b != null))
const gridYs = computed(() => {
  const lo = yLo.value, hi = yHi.value
  return [hi, (hi + lo) / 2, lo].map(v => ({ v, y: toY(v) }))
})
const xLabels = computed(() => {
  const n = series.value.length
  if (!n) return []
  const idxs = n <= 2 ? [0, n - 1] : [0, Math.floor((n - 1) / 2), n - 1]
  return idxs.map(i => ({ x: toX(i), text: series.value[i].date.slice(5).replace('-', '/') }))
})

// ホバー
const hovered = computed(() => (hover.value >= 0 ? series.value[hover.value] : null))
const hoverX = computed(() => (hover.value >= 0 ? toX(hover.value) : null))
const tooltipStyle = computed(() => {
  if (hover.value < 0) return {}
  const xPct = (toX(hover.value) / W.value) * 100
  const v = hovered.value?.value
  const yPx = v != null ? toY(v) : padT
  return { left: `${xPct}%`, top: `${Math.max(0, yPx - 46)}px` }
})

function onMove(e: PointerEvent) {
  const el = wrap.value
  if (!el || series.value.length < 2) return
  const rect = el.getBoundingClientRect()
  const px = e.clientX - rect.left
  const inner = W.value - padL - padR
  const frac = Math.min(1, Math.max(0, ((px / rect.width) * W.value - padL) / inner))
  hover.value = Math.round(frac * (series.value.length - 1))
}

let ro: ResizeObserver | null = null
function measure() { if (wrap.value) W.value = wrap.value.clientWidth || 320 }

async function load() {
  loading.value = true
  hover.value = -1
  try {
    const res = await $fetch<TrendData>('/api/fitbit/trend', { params: { metric: props.metric, days: days.value, date: props.date } })
    series.value = res.days
  } catch {
    series.value = []
  } finally {
    loading.value = false
    requestAnimationFrame(measure)
  }
}

function setDays(d: number) {
  if (days.value === d) return
  days.value = d
  load()
}

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (wrap.value) ro.observe(wrap.value)
  load()
})
onBeforeUnmount(() => ro?.disconnect())
watch(() => props.metric, load)
</script>
