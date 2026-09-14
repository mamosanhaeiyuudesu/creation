<template>
  <div class="flex items-center gap-4 flex-wrap sm:flex-nowrap">
    <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="shrink-0">
      <circle :cx="c" :cy="c" :r="r" fill="none" stroke="var(--fm-line)" :stroke-width="thickness" />
      <circle
        v-for="seg in segments"
        :key="seg.code"
        :cx="c"
        :cy="c"
        :r="r"
        fill="none"
        :stroke="seg.color"
        :stroke-width="thickness"
        :stroke-dasharray="`${seg.length} ${circumference - seg.length}`"
        :stroke-dashoffset="-seg.offset"
        :transform="`rotate(-90 ${c} ${c})`"
      />
      <text :x="c" :y="c - 4" text-anchor="middle" class="fm-num" font-size="11" fill="var(--fm-ink-soft)">{{ title }}</text>
      <text :x="c" :y="c + 14" text-anchor="middle" class="fm-num" font-size="15" font-weight="700" fill="var(--fm-ink)">
        {{ formatCompact(total) }}
      </text>
    </svg>

    <ul class="flex-1 min-w-[180px] space-y-1">
      <li v-for="seg in segments" :key="seg.code" class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ background: seg.color }" />
        <span class="text-[13px] truncate flex-1">{{ seg.name }}</span>
        <!-- 金額より比率が先。何にお金がかかっているかは比率で見るのがいちばん早い -->
        <span class="fm-num text-[14px] font-bold shrink-0">{{ Math.round(seg.ratio * 100) }}%</span>
        <span class="fm-num text-[11.5px] text-[var(--fm-ink-soft)] shrink-0 w-[72px] text-right">{{ formatYen(seg.amount) }}</span>
      </li>
      <li v-if="!segments.length" class="text-[13px] text-[var(--fm-ink-soft)] py-3">この月の記録はまだありません。</li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { BreakdownRow } from '~/types/farm-manager'

// 科目別内訳の円グラフ（仕様§6-2）。echarts を読み込むほどの図ではないので素のSVGで描く
// （本番で巨大チャンクを引かせない＝既存の方針。KeikoCumulativeChart のコメント参照）。
const props = withDefaults(
  defineProps<{
    rows: BreakdownRow[]
    /** 畑の中(緑) / 畑の外(グレー) / 売上(実り) のどの色味で塗るか */
    palette: 'in' | 'out' | 'rev'
    title: string
    size?: number
  }>(),
  { size: 148 }
)

const PALETTES: Record<'in' | 'out' | 'rev', string[]> = {
  in: ['#2f7239', '#4e9a5a', '#6fb377', '#94c99a', '#b7dcbb', '#d5ebd7'],
  out: ['#5f646c', '#8b8f96', '#a7abb1', '#c0c3c8', '#d5d7da', '#e6e7e9'],
  rev: ['#b3801f', '#d9a13c', '#e5b967', '#eecd92', '#f4dfbb', '#f9edd9'],
}

const thickness = 22
const c = computed(() => props.size / 2)
const r = computed(() => props.size / 2 - thickness / 2 - 1)
const circumference = computed(() => 2 * Math.PI * r.value)
const total = computed(() => props.rows.reduce((sum, row) => sum + row.amount, 0))

/** 上位5件＋その他。多すぎる凡例は「見て分かる」を壊す */
const segments = computed(() => {
  const sorted = [...props.rows].filter((row) => row.amount > 0).sort((a, b) => b.amount - a.amount)
  const top = sorted.slice(0, 5)
  const rest = sorted.slice(5)
  const list = rest.length
    ? [...top, { accountCode: '__rest', accountName: `その他 ${rest.length}件`, amount: rest.reduce((s, x) => s + x.amount, 0), ratio: 0 }]
    : top

  const sum = list.reduce((s, x) => s + x.amount, 0)
  let offset = 0
  const colors = PALETTES[props.palette]
  return list.map((row, i) => {
    const ratio = sum > 0 ? row.amount / sum : 0
    const length = circumference.value * ratio
    const seg = {
      code: row.accountCode,
      name: row.accountName,
      amount: row.amount,
      ratio,
      length,
      offset,
      color: colors[i % colors.length]!,
    }
    offset += length
    return seg
  })
})

function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}
function formatCompact(n: number): string {
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1)}億`
  if (Math.abs(n) >= 10000) return `${Math.round(n / 10000).toLocaleString('ja-JP')}万`
  return Math.round(n).toLocaleString('ja-JP')
}
</script>
