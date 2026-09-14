<template>
  <div class="space-y-2.5">
    <div v-for="row in rows" :key="row.key" class="fm-wf-row">
      <div class="flex items-baseline justify-between gap-2 mb-1">
        <div class="flex items-baseline gap-1.5 min-w-0">
          <span class="text-[13px] font-bold" :style="{ color: row.labelColor }">{{ row.label }}</span>
          <span v-if="row.sub" class="text-[11px] text-[var(--fm-ink-soft)] truncate">{{ row.sub }}</span>
        </div>
        <div class="flex items-baseline gap-1.5 shrink-0">
          <!-- 前月比。矢印の向きと色だけで「増えた/減った」が分かればよく、%は添え物 -->
          <span v-if="row.delta !== null" class="text-[11px] font-bold fm-num" :style="{ color: row.deltaColor }">
            {{ row.deltaArrow }}{{ row.deltaText }}
          </span>
          <span class="fm-num font-bold text-[17px] sm:text-[19px]" :style="{ color: row.amountColor }">
            {{ row.prefix }}{{ formatYen(Math.abs(row.value)) }}
          </span>
        </div>
      </div>
      <div class="h-3.5 rounded-full overflow-hidden" style="background: color-mix(in srgb, var(--fm-line) 70%, transparent)">
        <div
          class="h-full rounded-full transition-[width] duration-500"
          :style="{ width: row.width + '%', background: row.barColor }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { LadderTotals } from '~/types/farm-manager'

// 既存Excelの損益構造をそのまま縦に並べたウォーターフォール（仕様§6-2）。
// 変動費(畑の中)=緑系 / 固定費(畑の外)=グレー系 は必ず分ける。数字を読み解かせず、色と棒で5秒で判断させる。
const props = defineProps<{
  totals: LadderTotals
  /** 比較対象（前月 or 前年同月）。矢印の元になる */
  compare: LadderTotals | null
  compareLabel: string
}>()

function formatYen(n: number): string {
  return '¥' + Math.round(n).toLocaleString('ja-JP')
}

interface Row {
  key: string
  label: string
  sub: string
  value: number
  prefix: string
  width: number
  barColor: string
  labelColor: string
  amountColor: string
  delta: number | null
  deltaText: string
  deltaArrow: string
  deltaColor: string
}

const rows = computed<Row[]>(() => {
  const t = props.totals
  const c = props.compare
  // 棒の長さの基準は「売上高」。売上が無い月は最大の費目を基準にする
  const base = Math.max(t.revenue, t.variable + t.fixed, Math.abs(t.operatingProfit), 1)
  const w = (v: number) => Math.min(100, Math.max(0, (Math.abs(v) / base) * 100))

  const defs: { key: string; label: string; sub: string; value: number; prev: number | null; prefix: string; bar: string; labelColor: string; amountColor: string; goodWhenUp: boolean }[] = [
    {
      key: 'revenue', label: 'A. 売上高', sub: '', value: t.revenue, prev: c?.revenue ?? null, prefix: '',
      bar: 'var(--fm-rev)', labelColor: 'var(--fm-rev-deep)', amountColor: 'var(--fm-ink)', goodWhenUp: true,
    },
    {
      key: 'variable', label: 'B. 変動費', sub: '畑の中', value: t.variable, prev: c?.variable ?? null, prefix: '▲',
      bar: 'var(--fm-in)', labelColor: 'var(--fm-in-deep)', amountColor: 'var(--fm-in-deep)', goodWhenUp: false,
    },
    {
      key: 'gross', label: 'C. 粗利益', sub: 'A − B', value: t.grossProfit, prev: c?.grossProfit ?? null, prefix: '',
      bar: 'var(--fm-in-soft)', labelColor: 'var(--fm-ink-soft)', amountColor: 'var(--fm-ink)', goodWhenUp: true,
    },
    {
      key: 'fixed', label: 'D. 固定費', sub: '畑の外', value: t.fixed, prev: c?.fixed ?? null, prefix: '▲',
      bar: 'var(--fm-out)', labelColor: 'var(--fm-out-deep)', amountColor: 'var(--fm-out-deep)', goodWhenUp: false,
    },
    {
      key: 'operating', label: 'E. 営業利益', sub: 'C − D', value: t.operatingProfit, prev: c?.operatingProfit ?? null, prefix: '',
      bar: t.operatingProfit >= 0 ? 'var(--fm-plus)' : 'var(--fm-minus)',
      labelColor: 'var(--fm-ink)',
      amountColor: t.operatingProfit >= 0 ? 'var(--fm-plus)' : 'var(--fm-minus)',
      goodWhenUp: true,
    },
  ]

  return defs.map((d) => {
    let delta: number | null = null
    let deltaText = ''
    let deltaArrow = ''
    let deltaColor = 'var(--fm-ink-soft)'
    if (d.prev !== null && d.prev !== 0) {
      delta = (d.value - d.prev) / Math.abs(d.prev)
      const up = d.value > d.prev
      deltaArrow = up ? '↑' : d.value < d.prev ? '↓' : '→'
      deltaText = `${Math.abs(Math.round(delta * 100))}%`
      const good = up === d.goodWhenUp
      if (d.value !== d.prev) deltaColor = good ? 'var(--fm-plus)' : 'var(--fm-minus)'
    }
    return {
      key: d.key,
      label: d.label,
      sub: d.sub,
      value: d.value,
      prefix: d.value < 0 && !d.prefix ? '▲' : d.prefix,
      width: w(d.value),
      barColor: d.bar,
      labelColor: d.labelColor,
      amountColor: d.amountColor,
      delta,
      deltaText,
      deltaArrow,
      deltaColor,
    }
  })
})
</script>
