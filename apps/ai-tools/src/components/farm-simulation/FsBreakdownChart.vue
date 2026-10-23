<template>
  <div ref="wrapEl" class="relative select-none">
    <div class="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[11.5px] text-[var(--fs-ink-soft)]">
      <span class="flex items-center gap-1.5">
        <span class="inline-block w-3 h-[3px] rounded-full bg-[var(--fs-ink)]" />売上
      </span>
      <span v-for="g in GROUPS" :key="g.key" class="flex items-center gap-1.5">
        <span class="w-3 h-3 rounded-sm" :style="{ background: g.color }" />{{ g.label }}
      </span>
    </div>
    <svg
      ref="svgEl"
      :viewBox="`0 0 ${width} ${H}`"
      class="w-full h-auto block"
      role="img"
      :aria-label="`売上と経費の内訳。10年後の売上 ${formatMan(rows.at(-1)?.revenue ?? 0)}、経費 ${formatMan(rows.at(-1)?.expense ?? 0)}`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <g v-for="tick in ticks" :key="tick">
        <line :x1="PAD_L" :x2="width - PAD_R" :y1="y(tick)" :y2="y(tick)" stroke="var(--fs-line)" />
        <text :x="PAD_L - 6" :y="y(tick) + 4" text-anchor="end" class="fs-axis">{{ tick === 0 ? '0' : `${Math.round(tick / 10_000).toLocaleString('ja-JP')}万` }}</text>
      </g>

      <rect
        v-if="hover !== null"
        :x="cx(hover) - slot / 2" :y="PAD_T" :width="slot" :height="H - PAD_T - PAD_B"
        fill="var(--fs-ink)" opacity="0.04"
      />

      <!-- 経費の積み上げ。積み木の境目に2pxの隙間を入れて塊を見分けやすくする -->
      <g v-for="(r, i) in rows" :key="r.t">
        <rect
          v-for="seg in segments(r)" :key="seg.key"
          :x="cx(i) - barW / 2" :y="seg.y" :width="barW" :height="seg.h"
          :fill="seg.color" :rx="seg.top ? 3 : 0"
        />
        <text v-if="width >= 560 || i % 2 === 0" :x="cx(i)" :y="H - 8" text-anchor="middle" class="fs-axis">{{ i === 0 ? '実績' : width < 560 ? `${i}年` : `${i}年後` }}</text>
      </g>

      <!-- 売上は線で重ねる。棒の上に線が出ていれば黒字、棒に埋もれたら赤字 -->
      <path :d="revenuePath" fill="none" stroke="var(--fs-ink)" stroke-width="2" stroke-linejoin="round" />
      <circle
        v-for="(r, i) in rows" :key="`rv${r.t}`"
        :cx="cx(i)" :cy="y(r.revenue)" r="3.5" fill="var(--fs-ink)" stroke="var(--fs-panel)" stroke-width="1.5"
      />
    </svg>

    <div
      v-if="hover !== null && rows[hover]"
      class="fs-tip"
      :style="{ left: `${(cx(hover) / width) * 100}%`, transform: `translateX(${hover > rows.length / 2 ? '-105%' : '5%'})` }"
    >
      <p class="text-[12px] font-bold mb-1">{{ rows[hover]!.year }}年{{ hover === 0 ? '（実績）' : `（${hover}年後）` }}</p>
      <p class="tip-row"><span class="flex-1">売上</span><span class="fs-num font-bold">{{ formatMan(rows[hover]!.revenue) }}</span></p>
      <p v-for="g in [...GROUPS].reverse()" :key="g.key" class="tip-row">
        <span class="w-2.5 h-2.5 rounded-sm" :style="{ background: g.color }" />
        <span class="flex-1">{{ g.label }}</span>
        <span class="fs-num">{{ formatMan(rows[hover]![g.key]) }}</span>
      </p>
      <p class="tip-row border-t border-[var(--fs-line)] mt-1 pt-1">
        <span class="flex-1 font-bold">利益</span>
        <span class="fs-num font-bold" :style="{ color: rows[hover]!.profit < 0 ? 'var(--fs-danger)' : 'var(--fs-plus)' }">{{ formatMan(rows[hover]!.profit) }}</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { formatMan } from '~/utils/farm-simulation'
import type { YearRow } from '~/utils/farm-simulation'

type GroupKey = 'material' | 'labor' | 'depreciation' | 'other'

const props = defineProps<{ rows: YearRow[] }>()

// 下から: 資材費（いちばん動く・いちばん見たい）→人件費→その他→減価償却費（動かない）
const GROUPS: { key: GroupKey; label: string; color: string }[] = [
  { key: 'material', label: '資材費', color: '#c8762a' },
  { key: 'labor', label: '人件費', color: '#d55181' },
  { key: 'other', label: 'その他の経費', color: '#b5ae9c' },
  { key: 'depreciation', label: '減価償却費', color: '#8b8f96' },
]

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
const H = 280
const PAD_L = 52
const PAD_R = 12
const PAD_T = 12
const PAD_B = 26

const svgEl = ref<SVGSVGElement>()
const hover = ref<number | null>(null)

const slot = computed(() => (width.value - PAD_L - PAD_R) / Math.max(1, props.rows.length))
const barW = computed(() => Math.min(34, slot.value * 0.62))

const domain = computed(() => {
  const max = Math.max(1_000_000, ...props.rows.map((r) => Math.max(r.revenue, r.expense)))
  const step = niceStep(max / 5)
  return { max: Math.ceil(max / step) * step, step }
})

const ticks = computed(() => {
  const out: number[] = []
  for (let v = 0; v <= domain.value.max + 1; v += domain.value.step) out.push(v)
  return out
})

function niceStep(raw: number): number {
  const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

function cx(i: number): number {
  return PAD_L + slot.value * (i + 0.5)
}

function y(v: number): number {
  return PAD_T + (1 - Math.max(0, v) / domain.value.max) * (H - PAD_T - PAD_B)
}

function segments(r: YearRow) {
  const out: { key: string; y: number; h: number; color: string; top: boolean }[] = []
  let acc = 0
  const visible = GROUPS.filter((g) => r[g.key] > 0)
  visible.forEach((g, idx) => {
    const y0 = y(acc)
    acc += r[g.key]
    const y1 = y(acc)
    // 下の積み木との境目に2pxの隙間
    const h = Math.max(0, y0 - y1 - (idx > 0 ? 2 : 0))
    out.push({ key: g.key, y: y1, h, color: g.color, top: idx === visible.length - 1 })
  })
  return out
}

const revenuePath = computed(() =>
  props.rows.map((r, i) => `${i ? 'L' : 'M'}${cx(i).toFixed(1)},${y(r.revenue).toFixed(1)}`).join(' ')
)

function onMove(e: PointerEvent) {
  const el = svgEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * width.value
  const i = Math.floor((px - PAD_L) / slot.value)
  hover.value = i >= 0 && i < props.rows.length ? i : null
}
</script>

<style scoped>
.fs-axis {
  font-size: 11px;
  fill: var(--fs-ink-soft);
  font-variant-numeric: tabular-nums;
}
.fs-tip {
  position: absolute;
  top: 30px;
  min-width: 180px;
  background: var(--fs-panel);
  border: 1px solid var(--fs-line);
  border-radius: 12px;
  padding: 8px 10px;
  box-shadow: 0 6px 20px rgba(20, 60, 120, 0.12);
  pointer-events: none;
}
.tip-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
}
</style>
