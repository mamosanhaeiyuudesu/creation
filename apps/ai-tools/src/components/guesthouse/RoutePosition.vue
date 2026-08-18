<template>
  <div>
    <!-- 前半／中盤／後半の内訳 -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
      <div v-for="b in buckets" :key="b.key" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-3.5">
        <p class="text-[12px] text-[var(--gh-ink-soft)] mb-0.5">{{ b.label }}</p>
        <p class="gh-display text-[22px] font-bold leading-none">
          {{ b.count }}<span class="text-[12px] font-normal text-[var(--gh-ink-soft)] ml-0.5">組</span>
        </p>
        <div class="mt-2 h-1.5 rounded-full bg-[var(--gh-paper-2)] overflow-hidden">
          <div class="h-full rounded-full" :style="{ width: pct(b.count) + '%', background: b.color }" />
        </div>
      </div>
    </div>

    <!-- 位置の帯：左が旅のはじめ、右が旅のおわり。お客様ごとに点を置く -->
    <div v-if="placed.length" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-5 sm:px-7 py-4">
      <div class="relative" :style="{ height: trackHeight + 'px' }">
        <div class="absolute left-0 right-0 top-[5px] h-[2px] rounded-full bg-[var(--gh-paper-2)]" />
        <template v-for="d in placed" :key="d.key">
          <span
            v-if="d.row > 0"
            class="absolute w-px bg-[var(--gh-line)]"
            :style="{ left: d.left, top: '6px', height: d.row * ROW_H - 1 + 'px' }"
          />
          <span
            class="absolute w-[11px] h-[11px] rounded-full bg-[var(--gh-forest)]"
            :style="{ left: d.left, top: d.row * ROW_H + 'px', marginLeft: '-5.5px' }"
            :title="d.title"
          />
          <span
            class="absolute text-[10.5px] text-[var(--gh-ink-soft)] whitespace-nowrap"
            :style="{ left: d.left, top: d.row * ROW_H + 14 + 'px', transform: d.labelShift }"
            :title="d.title"
          >{{ d.label }}</span>
        </template>
      </div>
      <div class="flex justify-between text-[11px] text-[var(--gh-ink-faint)] mt-1">
        <span>旅のはじめ</span><span>中ほど</span><span>旅のおわり</span>
      </div>
    </div>

    <p v-else class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
      経由地の順番が読み取れた日記がまだありません。<br />
      日記の旅程に「東京 → 高山 → 宿 → 高野山」のように<b>通った順</b>が書かれていると読み取れます。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { routePhase, routeRatio, routePositionLabel, ROUTE_PHASES, ROUTE_PHASE_LABEL, type RoutePhase } from '~/utils/guesthouse-route'
import type { GuestProfile } from '~/types/guesthouse'

const props = defineProps<{ profiles: GuestProfile[] }>()

const PHASE_COLOR: Record<RoutePhase, string> = {
  early: 'var(--gh-forest-soft)',
  middle: 'var(--gh-forest)',
  late: 'var(--gh-persimmon)',
  unknown: 'var(--gh-ink-faint)',
}

/** 点が重なって読めなくなる距離（帯の幅に対する割合）。これより近い点は次の段へ落とす。 */
const MIN_GAP = 0.16
/** 段の高さ（点＋名前ラベル1行分）。 */
const ROW_H = 32

const buckets = computed(() =>
  ROUTE_PHASES.map((key) => ({
    key,
    label: ROUTE_PHASE_LABEL[key],
    color: PHASE_COLOR[key],
    count: props.profiles.filter((p) => routePhase(p.routeIndex, p.route.length) === key).length,
  }))
)

function pct(n: number): number {
  return props.profiles.length ? (n / props.profiles.length) * 100 : 0
}

interface Dot {
  key: string
  label: string
  title: string
  left: string
  labelShift: string
  row: number
}

/** 位置が読み取れたお客様を、左（旅のはじめ）から順に段へ振り分ける。 */
const placed = computed<Dot[]>(() => {
  const rows: number[] = [] // 段ごとの「最後に置いた点の位置」
  const dots: Dot[] = []

  const sorted = props.profiles
    .map((p) => ({ p, ratio: routeRatio(p.routeIndex, p.route.length) }))
    .filter((x): x is { p: GuestProfile; ratio: number } => x.ratio !== null)
    .sort((a, b) => a.ratio - b.ratio)

  for (const { p, ratio } of sorted) {
    let row = rows.findIndex((last) => ratio - last >= MIN_GAP)
    if (row === -1) {
      rows.push(ratio)
      row = rows.length - 1
    } else {
      rows[row] = ratio
    }
    dots.push({
      key: p.sessionId,
      label: p.guestName || '名前未設定',
      title: `${p.guestName || '名前未設定'}：${routePositionLabel(p.routeIndex, p.route.length)}`,
      left: ratio * 100 + '%',
      // 端の点はラベルが枠から出るので、中央寄せをやめて内側へ寄せる。
      labelShift: ratio < 0.12 ? 'translateX(-4px)' : ratio > 0.88 ? 'translateX(calc(-100% + 4px))' : 'translateX(-50%)',
      row,
    })
  }
  return dots
})

const trackHeight = computed(() => (placed.value.length ? (Math.max(...placed.value.map((d) => d.row)) + 1) * ROW_H : ROW_H))
</script>
