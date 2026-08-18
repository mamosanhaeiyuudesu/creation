<script setup lang="ts">
// 年ビュー。12ヶ月 × 31日のグリッドで「積み上がってきた感じ」を見せる。
// 塗り＝その日のポジのインパクト合計、下辺の線＝その日にネガがあった印。
// 幅は 31 列 × 約10px で収まるのでスマホでも横スクロールなしに入る。
type MomentKind = '達成' | '感謝' | '喜び' | 'しんどさ' | '不安'
interface MomentLike { id: string; ts: string; kind: MomentKind; impact: number }
interface KindMeta { polarity: 'pos' | 'neg'; chip: string; star: string; dot: string }

const props = defineProps<{
  moments: MomentLike[]
  meta: Record<MomentKind, KindMeta>
  year: string           // YYYY
  selected: string | null // YYYY-MM-DD
}>()

const emit = defineEmits<{ (e: 'select', dayKey: string): void }>()

const dayKeyOf = (iso: string): string => toJSTDate(iso).toISOString().slice(0, 10)
const todayKey = computed(() => toJSTDate(new Date().toISOString()).toISOString().slice(0, 10))

const byDay = computed(() => {
  const map = new Map<string, { posImpact: number; pos: number; neg: number }>()
  for (const m of props.moments) {
    const k = dayKeyOf(m.ts)
    if (!map.has(k)) map.set(k, { posImpact: 0, pos: 0, neg: 0 })
    const b = map.get(k)!
    if (props.meta[m.kind]?.polarity === 'neg') b.neg++
    else { b.pos++; b.posImpact += m.impact }
  }
  return map
})

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate()

interface Cell { key: string | null; posImpact: number; pos: number; neg: number }

const rows = computed(() => {
  const y = Number(props.year)
  return Array.from({ length: 12 }, (_, mi) => {
    const month = mi + 1
    const len = daysInMonth(y, month)
    const cells: Cell[] = Array.from({ length: 31 }, (_, di) => {
      if (di >= len) return { key: null, posImpact: 0, pos: 0, neg: 0 }
      const key = `${props.year}-${String(month).padStart(2, '0')}-${String(di + 1).padStart(2, '0')}`
      const b = byDay.value.get(key)
      return { key, posImpact: b?.posImpact ?? 0, pos: b?.pos ?? 0, neg: b?.neg ?? 0 }
    })
    return { month, cells }
  })
})

// 濃さはその年の最大値で正規化する
const maxPosImpact = computed(() =>
  Math.max(1, ...rows.value.flatMap(r => r.cells.map(c => c.posImpact))),
)

const fillFor = (cell: Cell): string => {
  if (!cell.key) return 'transparent'
  if (cell.posImpact === 0) return cell.neg > 0 ? 'rgba(148, 163, 184, 0.10)' : 'rgba(255, 255, 255, 0.035)'
  const ratio = cell.posImpact / maxPosImpact.value
  return `rgba(251, 146, 60, ${(0.14 + ratio * 0.62).toFixed(3)})`
}
</script>

<template>
  <div class="flex flex-col gap-[3px]">
    <div v-for="row in rows" :key="row.month" class="flex items-center gap-1.5">
      <span class="text-[10px] text-slate-500 tabular-nums w-[26px] shrink-0 text-right">{{ row.month }}月</span>
      <div class="flex gap-[2px] flex-1">
        <button
          v-for="(cell, di) in row.cells"
          :key="di"
          type="button"
          class="flex-1 aspect-square rounded-[2px] border-none p-0 min-w-0 relative transition-all"
          :class="[
            cell.key && (cell.pos || cell.neg) ? 'cursor-pointer hover:ring-1 hover:ring-orange-400/60' : 'cursor-default',
            selected === cell.key ? 'ring-1 ring-orange-500' : '',
            cell.key === todayKey ? 'outline outline-1 outline-slate-400/60' : '',
          ]"
          :style="{ background: fillFor(cell) }"
          :title="cell.key ? `${cell.key}　ポジ${cell.pos} / ネガ${cell.neg}` : ''"
          @click="cell.key && (cell.pos || cell.neg) && emit('select', cell.key)"
        >
          <span v-if="cell.neg > 0" class="absolute left-0 right-0 bottom-0 h-[2px] rounded-b-[2px] bg-slate-400/70" />
        </button>
      </div>
    </div>
    <!-- 凡例 -->
    <div class="flex items-center justify-end gap-3 pt-1 text-[10px] text-slate-600">
      <span class="flex items-center gap-1">
        少
        <span v-for="a in [0.14, 0.30, 0.46, 0.62, 0.76]" :key="a" class="w-2 h-2 rounded-[2px]" :style="{ background: `rgba(251, 146, 60, ${a})` }" />
        多
      </span>
      <span class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-[2px] relative" style="background: rgba(255,255,255,0.035)">
          <span class="absolute left-0 right-0 bottom-0 h-[2px] rounded-b-[2px] bg-slate-400/70" />
        </span>
        ネガ
      </span>
    </div>
  </div>
</template>
