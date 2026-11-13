<template>
  <div ref="wrapEl" class="relative select-none">
    <!-- 凡例（色だけに頼らないよう、線の形も添える） -->
    <div class="flex flex-wrap gap-x-3 gap-y-1 mb-1.5 text-[12px] text-[var(--fsr-ink-soft)]">
      <span v-if="hasForecast" class="flex items-center gap-1.5">
        <svg width="20" height="10" aria-hidden="true"><rect x="0" y="1" width="20" height="8" rx="2" fill="var(--fsr-band)" /><line x1="1" y1="5" x2="19" y2="5" stroke="var(--fsr-accent)" stroke-width="2" stroke-linecap="round" /></svg>
        見通し（幅つき）
      </span>
      <span v-if="past.length" class="flex items-center gap-1.5">
        <svg width="20" height="10" aria-hidden="true"><line x1="1" y1="5" x2="19" y2="5" stroke="var(--fsr-past)" stroke-width="1.5" stroke-linecap="round" /></svg>
        過去の年
      </span>
      <span v-if="current" class="flex items-center gap-1.5">
        <svg width="20" height="10" aria-hidden="true"><line x1="1" y1="5" x2="19" y2="5" stroke="var(--fsr-ink)" stroke-width="2" stroke-dasharray="4 3" stroke-linecap="round" /></svg>
        {{ current.season }}年の実績
      </span>
    </div>

    <svg
      :viewBox="`0 0 ${width} ${H}`"
      class="w-full block"
      :style="{ height: `${H}px` }"
      role="img"
      :aria-label="ariaLabel"
      @pointermove="onMove"
      @pointerdown="onMove"
      @pointerleave="hover = null"
    >
      <g v-for="t in ticks" :key="t">
        <line :x1="PAD_L" :x2="width - PAD_R" :y1="y(t)" :y2="y(t)" :stroke="t === 0 ? 'var(--fsr-line-strong)' : 'var(--fsr-line)'" />
        <text :x="PAD_L - 6" :y="y(t) + 4" text-anchor="end" class="fsr-axis">{{ t.toLocaleString('ja-JP') }}</text>
      </g>
      <text :x="PAD_L - 6" :y="PAD_T - 8" text-anchor="end" class="fsr-axis">kg</text>
      <template v-for="(idx, i) in indices" :key="idx">
        <text v-if="idx % 3 === 0" :x="x(i)" :y="H - 8" text-anchor="middle" class="fsr-axis">{{ monthOf(idx) }}月</text>
      </template>

      <line v-if="hover !== null" :x1="x(hover)" :x2="x(hover)" :y1="PAD_T" :y2="H - PAD_B" stroke="var(--fsr-ink-soft)" opacity="0.4" />

      <!-- 過去の年 -->
      <path v-for="p in past" :key="p.season" :d="line(p.bins)" fill="none" stroke="var(--fsr-past)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
      <!-- 見通し（幅＋真ん中の線） -->
      <template v-if="hasForecast">
        <path :d="band" fill="var(--fsr-band)" />
        <path :d="line(bins.map((b) => b.mid))" fill="none" stroke="var(--fsr-accent)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
      </template>
      <!-- 今季の実績 -->
      <path v-if="current" :d="line(current.bins)" fill="none" stroke="var(--fsr-ink)" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" stroke-linecap="round" />

      <template v-if="hover !== null">
        <circle v-if="hasForecast" :cx="x(hover)" :cy="y(bins[indices[hover]!]!.mid)" r="4.5" fill="var(--fsr-accent)" stroke="var(--fsr-panel)" stroke-width="2" />
        <circle v-if="current" :cx="x(hover)" :cy="y(current.bins[indices[hover]!] ?? 0)" r="4" fill="var(--fsr-ink)" stroke="var(--fsr-panel)" stroke-width="2" />
      </template>
    </svg>

    <!-- 触った旬の値 -->
    <div
      v-if="hover !== null"
      class="fsr-tip"
      :style="{ left: `${Math.min(Math.max(x(hover), 90), width - 90)}px` }"
    >
      <p class="font-bold m-0 mb-0.5">{{ labelOf(indices[hover]!) }}</p>
      <p v-if="hasForecast" class="m-0">
        <span class="fsr-tip-key" style="background: var(--fsr-accent)" />見通し {{ fmt(bins[indices[hover]!]!.mid) }}kg
        <span class="text-[var(--fsr-ink-faint)]">（{{ fmt(bins[indices[hover]!]!.low) }}〜{{ fmt(bins[indices[hover]!]!.high) }}）</span>
      </p>
      <p v-if="current" class="m-0"><span class="fsr-tip-key" style="background: var(--fsr-ink)" />{{ current.season }}年 {{ fmt(current.bins[indices[hover]!] ?? 0) }}kg</p>
      <p v-for="p in past" :key="p.season" class="m-0"><span class="fsr-tip-key" style="background: var(--fsr-past)" />{{ p.season }}年 {{ fmt(p.bins[indices[hover]!] ?? 0) }}kg</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { junLabel } from '~/utils/farm-simulator'
import type { Bin } from '~/utils/farm-simulator'

const props = defineProps<{
  bins: Bin[]
  past: { season: number; bins: number[] }[]
  current: { season: number; bins: number[] } | null
  range: [number, number]
  startMonth: number
  title: string
}>()

const H = 230
const PAD_L = 52
const PAD_R = 14
const PAD_T = 22
const PAD_B = 28

const wrapEl = ref<HTMLElement | null>(null)
const width = ref(600)
const hover = ref<number | null>(null)
let ro: ResizeObserver | null = null
onMounted(() => {
  if (!wrapEl.value) return
  width.value = wrapEl.value.clientWidth || 600
  ro = new ResizeObserver(() => {
    if (wrapEl.value) width.value = Math.max(280, wrapEl.value.clientWidth)
  })
  ro.observe(wrapEl.value)
})
onBeforeUnmount(() => ro?.disconnect())

const hasForecast = computed(() => props.bins.length > 0)
const indices = computed(() => {
  const out: number[] = []
  for (let i = props.range[0]; i <= props.range[1]; i++) out.push(i)
  return out
})

const maxY = computed(() => {
  let m = 0
  for (const i of indices.value) {
    m = Math.max(m, props.bins[i]?.high ?? 0, props.current?.bins[i] ?? 0)
    for (const p of props.past) m = Math.max(m, p.bins[i] ?? 0)
  }
  return niceMax(m || 1)
})

function niceMax(v: number): number {
  const p = 10 ** Math.floor(Math.log10(v))
  for (const k of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (k * p >= v) return k * p
  return 10 * p
}

const ticks = computed(() => [0, 1, 2, 3, 4].map((k) => Math.round((maxY.value * k) / 4)))

function x(i: number): number {
  const n = Math.max(1, indices.value.length - 1)
  return PAD_L + ((width.value - PAD_L - PAD_R) * i) / n
}
function y(v: number): number {
  return H - PAD_B - ((H - PAD_T - PAD_B) * v) / maxY.value
}
function line(values: number[]): string {
  return indices.value.map((idx, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(values[idx] ?? 0).toFixed(1)}`).join('')
}
const band = computed(() => {
  const top = indices.value.map((idx, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(props.bins[idx]?.high ?? 0).toFixed(1)}`)
  const bottom = indices.value
    .map((idx, i) => `L${x(i).toFixed(1)},${y(props.bins[idx]?.low ?? 0).toFixed(1)}`)
    .reverse()
  return `${top.join('')}${bottom.join('')}Z`
})

function monthOf(idx: number): number {
  return ((props.startMonth - 1 + Math.floor(idx / 3)) % 12) + 1
}
function labelOf(idx: number): string {
  return junLabel(idx, props.startMonth)
}
function fmt(v: number): string {
  return Math.round(v).toLocaleString('ja-JP')
}

function onMove(e: PointerEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * width.value
  const n = indices.value.length - 1
  const i = Math.round(((px - PAD_L) / (width.value - PAD_L - PAD_R)) * n)
  hover.value = Math.min(n, Math.max(0, i))
}

const ariaLabel = computed(() => `${props.title}の旬ごとの量。過去の年と見通しを重ねたグラフ`)
</script>

<style scoped>
.fsr-axis { font-size: 11px; fill: var(--fsr-ink-faint); font-variant-numeric: tabular-nums; }
.fsr-tip {
  position: absolute;
  top: 34px;
  transform: translateX(-50%);
  min-width: 170px;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--fsr-line);
  border-radius: 8px;
  background: var(--fsr-panel);
  box-shadow: 0 6px 20px rgba(20, 60, 120, 0.14);
  font-size: 12px;
  line-height: 1.6;
  color: var(--fsr-ink);
  pointer-events: none;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fsr-tip-key { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
</style>
