<script setup lang="ts">
// できごとの月カレンダー。セルの濃さ＝その日のポジのインパクト合計、
// 中のドット＝タグの色、右上の▲＝ネガがあった印。
// クライアント限定にしているのは、できごとがログイン後に非同期で届くため
// SSR では必ず空カレンダーになり、hydration で作り直しになるのを避けるため。
type MomentKind = '達成' | '感謝' | '喜び' | 'しんどさ' | '不安'
interface MomentLike { id: string; ts: string; kind: MomentKind; impact: number }
interface KindMeta { polarity: 'pos' | 'neg'; chip: string; star: string; dot: string }

const props = defineProps<{
  moments: MomentLike[]
  meta: Record<MomentKind, KindMeta>
  month: string          // YYYY-MM
  selected: string | null // YYYY-MM-DD
}>()

const emit = defineEmits<{ (e: 'select', dayKey: string | null): void }>()

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

// ISO → JSTの YYYY-MM-DD（LogModal と同じ数え方に揃える）
const dayKeyOf = (iso: string): string => toJSTDate(iso).toISOString().slice(0, 10)

const todayKey = computed(() => toJSTDate(new Date().toISOString()).toISOString().slice(0, 10))

interface DayCell {
  key: string
  date: number
  inMonth: boolean
  pos: MomentLike[]
  neg: MomentLike[]
  posImpact: number
}

// 日ごとに仕分けしておく（月をまたいで使い回せるよう月で絞らない）
const byDay = computed(() => {
  const map = new Map<string, { pos: MomentLike[]; neg: MomentLike[]; posImpact: number }>()
  for (const m of props.moments) {
    const k = dayKeyOf(m.ts)
    if (!map.has(k)) map.set(k, { pos: [], neg: [], posImpact: 0 })
    const bucket = map.get(k)!
    if (props.meta[m.kind]?.polarity === 'neg') {
      bucket.neg.push(m)
    } else {
      bucket.pos.push(m)
      bucket.posImpact += m.impact
    }
  }
  return map
})

// 月曜始まりではなく日曜始まり（日本のカレンダーの既定）
const cells = computed<DayCell[]>(() => {
  const first = new Date(`${props.month}-01T00:00:00Z`)
  if (Number.isNaN(first.getTime())) return []
  const gridStart = new Date(first)
  gridStart.setUTCDate(1 - first.getUTCDay())

  const out: DayCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setUTCDate(gridStart.getUTCDate() + i)
    const key = d.toISOString().slice(0, 10)
    const bucket = byDay.value.get(key)
    out.push({
      key,
      date: d.getUTCDate(),
      inMonth: key.slice(0, 7) === props.month,
      pos: bucket?.pos ?? [],
      neg: bucket?.neg ?? [],
      posImpact: bucket?.posImpact ?? 0,
    })
  }
  // 最終週がまるごと翌月なら落とす（6行固定だと下が1行空くことがある）
  return out.slice(0, out.slice(35).some(c => c.inMonth) ? 42 : 35)
})

// 濃さの基準はその月の最大値。月ごとに正規化することで、
// 記録の少ない月でも「その月の中での濃淡」が読める
const maxPosImpact = computed(() =>
  Math.max(1, ...cells.value.filter(c => c.inMonth).map(c => c.posImpact)),
)

const fillFor = (cell: DayCell): string => {
  if (!cell.inMonth || cell.posImpact === 0) return 'transparent'
  const ratio = cell.posImpact / maxPosImpact.value
  return `rgba(251, 146, 60, ${(0.1 + ratio * 0.42).toFixed(3)})`
}

// ドットは最大4つ。大きいできごとから並べる
const dotsFor = (cell: DayCell) =>
  [...cell.pos].sort((a, b) => b.impact - a.impact).slice(0, 4)

const onSelect = (cell: DayCell) => {
  if (!cell.inMonth) return
  if (cell.pos.length === 0 && cell.neg.length === 0) return
  emit('select', props.selected === cell.key ? null : cell.key)
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <div class="grid grid-cols-7 gap-1">
      <div
        v-for="(w, i) in WEEKDAYS"
        :key="w"
        class="text-center text-[10px] font-semibold py-0.5"
        :class="i === 0 ? 'text-rose-400/70' : i === 6 ? 'text-sky-400/70' : 'text-slate-500'"
      >{{ w }}</div>
    </div>
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="cell in cells"
        :key="cell.key"
        type="button"
        class="relative aspect-square rounded-lg border flex flex-col items-center justify-start pt-1 gap-1 transition-all"
        :class="[
          !cell.inMonth
            ? 'border-transparent opacity-25 cursor-default'
            : cell.pos.length || cell.neg.length
              ? 'cursor-pointer hover:border-orange-400/50'
              : 'cursor-default',
          selected === cell.key
            ? 'border-orange-500 ring-1 ring-orange-500/50'
            : cell.key === todayKey && cell.inMonth
              ? 'border-slate-400/50'
              : 'border-white/[0.06]',
        ]"
        :style="{ background: fillFor(cell) }"
        @click="onSelect(cell)"
      >
        <span
          class="text-[10px] tabular-nums leading-none"
          :class="cell.inMonth ? (cell.posImpact > 0 ? 'text-slate-200 font-semibold' : 'text-slate-500') : 'text-slate-600'"
        >{{ cell.date }}</span>
        <span v-if="cell.neg.length" class="absolute top-[2px] right-[3px] text-[8px] leading-none text-slate-400/70">▲</span>
        <span class="flex flex-wrap items-center justify-center gap-[2px] px-1">
          <span
            v-for="m in dotsFor(cell)"
            :key="m.id"
            class="w-[5px] h-[5px] rounded-full"
            :class="meta[m.kind].dot"
          />
        </span>
      </button>
    </div>
  </div>
</template>
