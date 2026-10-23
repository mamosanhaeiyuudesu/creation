<template>
  <div ref="wrapEl" class="relative select-none">
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${width} ${H}`"
      class="w-full h-auto block"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <!-- 目盛り。0円の線だけ濃くして「ここを割ったら赤字」を見せる -->
      <g v-for="tick in ticks" :key="tick">
        <line
          :x1="PAD_L" :x2="width - PAD_R" :y1="y(tick)" :y2="y(tick)"
          :stroke="tick === 0 ? 'var(--fs-danger)' : 'var(--fs-line)'"
          :stroke-width="tick === 0 ? 1.2 : 1"
          :stroke-dasharray="tick === 0 ? '4 3' : undefined"
        />
        <text :x="PAD_L - 6" :y="y(tick) + 4" text-anchor="end" class="fs-axis">{{ axisLabel(tick) }}</text>
      </g>
      <template v-for="(yr, i) in years" :key="yr">
        <text v-if="showTick(i)" :x="x(i)" :y="H - 8" text-anchor="middle" class="fs-axis">{{ tickLabel(i) }}</text>
      </template>

      <!-- 出発点（実績）と試算の境目 -->
      <line :x1="x(0)" :x2="x(0)" :y1="PAD_T" :y2="H - PAD_B" stroke="var(--fs-line)" />

      <line
        v-if="hover !== null"
        :x1="x(hover)" :x2="x(hover)" :y1="PAD_T" :y2="H - PAD_B"
        stroke="var(--fs-ink-soft)" stroke-width="1" opacity="0.5"
      />

      <g v-for="s in series" :key="s.id">
        <path
          :d="path(s.values)"
          fill="none"
          :stroke="s.color"
          :stroke-width="s.width ?? 2"
          :stroke-dasharray="s.dashed ? '6 4' : undefined"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
        <circle
          v-if="hover !== null"
          :cx="x(hover)" :cy="y(s.values[hover] ?? 0)" r="4.5"
          :fill="s.color" stroke="var(--fs-panel)" stroke-width="2"
        />
      </g>

      <!-- 線の右端に名前。重なる場合は上下に押し広げる -->
      <g v-for="l in endLabels" :key="l.id">
        <circle :cx="width - PAD_R + 6" :cy="l.y" r="3" :fill="l.color" />
        <text :x="width - PAD_R + 13" :y="l.y + 4" class="fs-end">{{ l.label }}</text>
      </g>
    </svg>

    <!-- ホバー（タップ）した年の値。線の色の横に名前と金額を置き、色だけに頼らない -->
    <div
      v-if="hover !== null"
      class="fs-tip"
      :style="{ left: `${(x(hover) / width) * 100}%`, transform: `translateX(${hover > years.length / 2 ? '-105%' : '5%'})` }"
    >
      <p class="text-[12px] font-bold mb-1">{{ years[hover] }}年{{ hover === 0 ? '（実績）' : `（${hover}年後）` }}</p>
      <p v-for="s in sortedAt(hover)" :key="s.id" class="flex items-center gap-1.5 text-[12px] leading-5">
        <span class="inline-block w-2.5 h-[3px] rounded-full" :style="{ background: s.color }" />
        <span class="flex-1">{{ s.label }}</span>
        <span class="fs-num font-bold" :style="{ color: (s.values[hover] ?? 0) < 0 ? 'var(--fs-danger)' : undefined }">
          {{ formatMan(s.values[hover] ?? 0) }}
        </span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatMan } from '~/utils/farm-simulation'

export interface LineSeries {
  id: string
  label: string
  /** 線の端に置く短い名前。無ければ label */
  short?: string
  color: string
  values: number[]
  dashed?: boolean
  width?: number
}

const props = defineProps<{ series: LineSeries[]; years: number[] }>()

// 幅は実際の表示幅に合わせる（viewBox を固定にすると、スマホで文字が6px程度まで縮んで読めない）
const wrapEl = ref<HTMLElement>()
const width = ref(680)
let ro: ResizeObserver | null = null
onMounted(() => {
  if (!wrapEl.value) return
  ro = new ResizeObserver(([e]) => {
    if (e) width.value = Math.max(300, Math.round(e.contentRect.width))
  })
  ro.observe(wrapEl.value)
})
onBeforeUnmount(() => ro?.disconnect())
const H = 300
const PAD_L = 52
const PAD_R = 84
const PAD_T = 14
const PAD_B = 28

const svgEl = ref<SVGSVGElement>()
const hover = ref<number | null>(null)

const domain = computed(() => {
  const all = props.series.flatMap((s) => s.values)
  let min = Math.min(0, ...all)
  let max = Math.max(0, ...all)
  if (min === max) max = min + 1_000_000
  const step = niceStep((max - min) / 5)
  min = Math.floor(min / step) * step
  max = Math.ceil(max / step) * step
  return { min, max, step }
})

const ticks = computed(() => {
  const out: number[] = []
  for (let v = domain.value.min; v <= domain.value.max + 1; v += domain.value.step) out.push(Math.round(v))
  return out
})

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

function x(i: number): number {
  const n = Math.max(1, props.years.length - 1)
  return PAD_L + 10 + (i / n) * (width.value - PAD_L - PAD_R - 20)
}

function y(v: number): number {
  const { min, max } = domain.value
  return PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B)
}

function path(values: number[]): string {
  return values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
}

/** 狭い画面では1年おきにして、目盛りの文字が重ならないようにする */
const narrow = computed(() => width.value < 560)
function showTick(i: number): boolean {
  return !narrow.value || i % 2 === 0
}
function tickLabel(i: number): string {
  return i === 0 ? '実績' : narrow.value ? `${i}年` : `${i}年後`
}

function axisLabel(v: number): string {
  return v === 0 ? '0' : `${Math.round(v / 10_000).toLocaleString('ja-JP')}万`
}

const endLabels = computed(() => {
  const last = props.years.length - 1
  const items = props.series
    .map((s) => ({ id: s.id, label: s.short ?? s.label, color: s.color, y: y(s.values[last] ?? 0) }))
    .sort((a, b) => a.y - b.y)
  const GAP = 15
  for (let i = 1; i < items.length; i++) {
    if (items[i]!.y - items[i - 1]!.y < GAP) items[i]!.y = items[i - 1]!.y + GAP
  }
  // 下にはみ出したぶんを全体で持ち上げる
  const overflow = (items.at(-1)?.y ?? 0) - (H - PAD_B)
  if (overflow > 0) items.forEach((it) => (it.y -= overflow))
  return items
})

function sortedAt(i: number) {
  return [...props.series].sort((a, b) => (b.values[i] ?? 0) - (a.values[i] ?? 0))
}

function onMove(e: PointerEvent) {
  const el = svgEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * width.value
  let best = 0
  let bestD = Infinity
  props.years.forEach((_, i) => {
    const d = Math.abs(x(i) - px)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  hover.value = best
}

const ariaLabel = computed(() =>
  props.series
    .map((s) => `${s.label}: ${formatMan(s.values[0] ?? 0)}から10年後に${formatMan(s.values.at(-1) ?? 0)}`)
    .join('。')
)
</script>

<style scoped>
.fs-axis {
  font-size: 11px;
  fill: var(--fs-ink-soft);
  font-variant-numeric: tabular-nums;
}
.fs-end {
  font-size: 11.5px;
  font-weight: 700;
  fill: var(--fs-ink);
}
.fs-tip {
  position: absolute;
  top: 6px;
  min-width: 190px;
  background: var(--fs-panel);
  border: 1px solid var(--fs-line);
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 6px 20px rgba(20, 60, 120, 0.12);
  pointer-events: none;
}
</style>
