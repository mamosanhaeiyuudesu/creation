<template>
  <div class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
    <div v-if="loading" class="h-[120px] flex items-center justify-center text-slate-500 text-xs animate-pulse">読み込み中…</div>
    <div v-else-if="error" class="h-[120px] flex items-center justify-center text-rose-400 text-xs">{{ error }}</div>
    <div v-else-if="!data || data.totalMinutes <= 0" class="h-[120px] flex items-center justify-center text-slate-600 text-xs">睡眠データがありません</div>

    <div v-else>
      <div class="flex items-baseline justify-between gap-2 mb-1">
        <div class="text-xs font-semibold text-slate-400">😴 睡眠</div>
        <div class="text-lg font-bold text-indigo-300 tabular-nums">{{ fmtDuration(data.asleepMinutes) }}</div>
      </div>
      <div class="flex items-center gap-2.5 mb-3 text-[11px] text-slate-400">
        <span class="tabular-nums">{{ data.bedtime }} → {{ data.waketime }}</span>
        <span class="text-slate-700">|</span>
        <span>睡眠効率 <span class="font-semibold text-slate-200 tabular-nums">{{ data.efficiency }}%</span></span>
        <span class="text-slate-700">|</span>
        <span>中途覚醒 <span class="font-semibold text-slate-200 tabular-nums">{{ data.awakeCount }}回</span></span>
      </div>
      <div class="flex items-stretch gap-2">
        <!-- 左: ステージ名 -->
        <div class="relative shrink-0 w-11" :style="{ height: `${hypH}px` }">
          <div
            v-for="(lv, i) in stageLevels"
            :key="lv.stage"
            class="absolute left-0 flex items-center gap-1.5 text-[10px] text-slate-300 whitespace-nowrap"
            :style="{ top: `${rowY(i)}px`, height: `${rowH}px` }"
          >
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: stageColor(lv.stage) }" />{{ lv.jp }}
          </div>
        </div>
        <!-- 中央: タイムライン -->
        <!-- touch-pan-y: タップで値を出しつつ、縦ドラッグはページのスクロールに使えるようにする -->
        <div ref="hypWrap" class="relative flex-1 min-w-0 touch-pan-y" @pointermove="onHypMove" @pointerdown="onHypDown" @pointerleave="onHypLeave" @pointercancel="onHypCancel">
          <svg :viewBox="`0 0 ${hypW} ${hypH}`" preserveAspectRatio="none" class="w-full block" :style="{ height: `${hypH}px` }">
            <g v-for="(lv, i) in stageLevels" :key="lv.stage">
              <line :x1="0" :x2="hypW" :y1="rowY(i) + rowH / 2" :y2="rowY(i) + rowH / 2" class="stroke-white/[0.04]" stroke-width="1" vector-effect="non-scaling-stroke" />
            </g>
            <rect
              v-for="(seg, i) in data.timeline"
              :key="i"
              :x="seg.start"
              :y="rowY(levelIndex(seg.stage))"
              :width="Math.max(seg.duration, 1)"
              :height="rowH"
              rx="2"
              :fill="stageColor(seg.stage)"
              :fill-opacity="hoverSeg && hoverSeg !== seg ? 0.45 : 1"
            />
            <line v-if="hoverSeg" :x1="hoverX" :x2="hoverX" :y1="0" :y2="hypH" stroke="#fff" stroke-opacity="0.3" stroke-width="1" vector-effect="non-scaling-stroke" />
          </svg>
          <div
            v-if="hoverSeg"
            class="pointer-events-none absolute z-50 px-2 py-1 rounded-md bg-slate-900/95 border border-white/10 text-[11px] whitespace-nowrap -translate-x-1/2 -translate-y-full shadow-lg top-0"
            :style="{ left: `${(hoverX / hypW) * 100}%` }"
          >
            <span class="font-semibold" :style="{ color: stageColor(hoverSeg.stage) }">{{ stageJp(hoverSeg.stage) }}</span>
            <span class="ml-1.5 text-slate-300 tabular-nums">{{ hoverSeg.duration }}分</span>
            <span class="ml-1.5 text-slate-500 tabular-nums">{{ segClock(hoverSeg) }}</span>
          </div>
        </div>
        <!-- 右: 時間・目安に対する達成率（列幅を固定し、目安の有無に関わらず縦に揃える） -->
        <div class="relative shrink-0 w-[132px]" :style="{ height: `${hypH}px` }">
          <div
            v-for="(lv, i) in stageLevels"
            :key="lv.stage"
            class="absolute right-0 flex items-center gap-1.5 text-[10px] text-slate-400 tabular-nums whitespace-nowrap"
            :style="{ top: `${rowY(i)}px`, height: `${rowH}px` }"
          >
            <span class="w-14 text-right shrink-0">{{ fmtDuration(data.stages[lv.stage].minutes) }}</span>
            <span class="w-16 text-right shrink-0 font-semibold" :class="goalPctClass(lv.stage)">
              {{ goalPct(lv.stage) !== null ? `目安の${goalPct(lv.stage)}%` : '' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { SleepDetail, SleepStage } from '~/types/fitbit'
import { SLEEP_STAGE_GOAL_MIN, SLEEP_STAGE_LEVELS, sleepStageColor, sleepStageJp } from '~/utils/sleepStage'

const props = defineProps<{ date: string }>()

const data = ref<SleepDetail | null>(null)
const loading = ref(true)
const error = ref('')

const stageLevels = SLEEP_STAGE_LEVELS
const rowH = 18
const rowGap = 12
const rowY = (i: number) => 6 + i * (rowH + rowGap)
const hypH = rowY(stageLevels.length - 1) + rowH + 6
const levelIndex = (s: SleepStage) => stageLevels.findIndex(l => l.stage === s)

const hypW = computed(() => Math.max(1, data.value?.totalMinutes ?? 1))

const stageColor = sleepStageColor
const stageJp = sleepStageJp

/** そのステージの目安時間に対する達成率（%）。覚醒など目安を持たないステージは null */
function goalPct(stage: SleepStage): number | null {
  const goal = SLEEP_STAGE_GOAL_MIN[stage]
  if (!goal || !data.value) return null
  return Math.round((data.value.stages[stage].minutes / goal) * 100)
}

/** 達成率の色分け: 90%以上で足りている、70%未満は不足 */
function goalPctClass(stage: SleepStage): string {
  const pct = goalPct(stage)
  if (pct === null) return ''
  if (pct >= 90) return 'text-emerald-300'
  if (pct >= 70) return 'text-slate-200'
  return 'text-amber-400'
}

// ヒプノグラムのホバー
type Seg = SleepDetail['timeline'][number]
const hypWrap = ref<HTMLElement>()
const hoverSeg = ref<Seg | null>(null)
const hoverX = ref(0)

function pickHyp(e: PointerEvent) {
  const el = hypWrap.value
  const d = data.value
  if (!el || !d) return
  const rect = el.getBoundingClientRect()
  const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  const minute = frac * hypW.value
  const seg = d.timeline.find(s => minute >= s.start && minute < s.start + s.duration) ?? null
  hoverSeg.value = seg
  hoverX.value = seg ? seg.start + seg.duration / 2 : minute
}
// マウスはホバー追従、タッチはタップした区間だけを選ぶ（スクロール中に出ないように）
function onHypMove(e: PointerEvent) { if (e.pointerType === 'touch') return; pickHyp(e) }
function onHypDown(e: PointerEvent) { pickHyp(e) }
function onHypLeave(e: PointerEvent) { if (e.pointerType !== 'touch') hoverSeg.value = null }
// ブラウザがスクロール操作として引き取ったとき（縦ドラッグ）はタップ扱いにしない
function onHypCancel() { hoverSeg.value = null }
// タッチで出したツールチップは、グラフ以外をタップしたら閉じる
function onDocDown(e: PointerEvent) {
  if (e.pointerType !== 'touch') return
  if (!hypWrap.value?.contains(e.target as Node)) hoverSeg.value = null
}
onMounted(() => document.addEventListener('pointerdown', onDocDown as EventListener))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocDown as EventListener))

/** 就寝時刻 + 経過分 → 時計表示（HH:MM） */
function segClock(seg: Seg): string {
  const bed = data.value?.bedtime ?? '00:00'
  const [bh, bm] = bed.split(':').map(Number)
  const total = (bh * 60 + bm + seg.start) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return m > 0 ? `${h}時間${m}分` : `${h}時間`
  return `${m}分`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await $fetch<SleepDetail>('/api/fitbit/sleep', { params: { date: props.date } })
  } catch (e: any) {
    error.value = e?.data?.message || '睡眠データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.date, load)
</script>
