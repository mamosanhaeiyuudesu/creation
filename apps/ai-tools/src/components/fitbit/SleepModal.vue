<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[560px] max-h-[92dvh] overflow-y-auto bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl [scrollbar-width:thin]">
      <!-- ハンドル / 日送り / 閉じる -->
      <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[#0f172a]/95 backdrop-blur border-b border-white/[0.06]">
        <h2 class="text-sm font-bold text-slate-100">睡眠</h2>
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center" @click="shiftDay(-1)">‹</button>
          <span class="text-xs font-semibold text-slate-200 min-w-[76px] text-center tabular-nums">{{ dateLabel }}</span>
          <button
            class="w-7 h-7 rounded-lg flex items-center justify-center"
            :class="isToday ? 'text-slate-700 cursor-default' : 'text-slate-300 hover:bg-white/10'"
            :disabled="isToday"
            @click="shiftDay(1)"
          >›</button>
          <!-- 更新（最新データに取り直す。キャッシュを無視） -->
          <button
            class="w-7 h-7 rounded-lg text-slate-300 flex items-center justify-center hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent"
            title="最新データに更新"
            :disabled="loading || refreshing"
            @click="load(true)"
          ><span :class="refreshing && 'inline-block animate-spin'" aria-hidden>⟳</span></button>
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center text-slate-500 text-sm">読み込み中…</div>
      <div v-else-if="error" class="p-10 text-center text-rose-400 text-sm">{{ error }}</div>

      <div v-else-if="data" class="p-5 flex flex-col gap-6">
        <!-- 総睡眠 -->
        <div class="flex flex-col gap-1">
          <div class="text-2xl font-bold text-slate-100 tabular-nums">{{ fmtDuration(data.asleepMinutes) }}</div>
          <div class="text-sm text-slate-400">{{ data.bedtime }} → {{ data.waketime }}</div>
          <div class="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400">
            <span>睡眠効率 <span class="font-semibold text-slate-200 tabular-nums">{{ data.efficiency }}%</span></span>
            <span class="text-slate-700">|</span>
            <span>中途覚醒 <span class="font-semibold text-slate-200 tabular-nums">{{ data.awakeCount }}回</span></span>
          </div>
        </div>

        <!-- ヒプノグラム（ステージ帯 + 内訳: 左にラベル、右に時間/割合） -->
        <div>
          <div class="flex items-baseline justify-between gap-2 mb-2">
            <div class="text-xs font-semibold text-slate-400">睡眠ステージ</div>
            <div class="text-[10px] text-slate-500">目安＝7時間睡眠での標準的な配分（深い1.2h・浅い3.5h・レム1.5h）</div>
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
            <!-- touch-pan-y: タップで値を出しつつ、縦ドラッグはモーダルのスクロールに使えるようにする -->
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

        <!-- 睡眠時間の推移（合計／ステージ別を切り替え） -->
        <div class="border-t border-white/[0.06] pt-4">
          <div class="flex items-center gap-2 mb-2">
            <div class="text-xs font-semibold text-slate-400">{{ sleepTrend.label }}</div>
            <div class="ml-auto flex items-center gap-1.5 text-[11px]">
              <template v-for="(o, i) in SLEEP_TREND_OPTIONS" :key="o.metric">
                <span v-if="i > 0" class="text-slate-700">/</span>
                <button
                  class="bg-transparent border-none p-0 cursor-pointer font-semibold transition-colors"
                  :class="o.metric === sleepTrendMetric ? 'text-slate-100' : 'text-slate-600 hover:text-slate-400'"
                  :style="o.metric === sleepTrendMetric ? { color: o.color } : undefined"
                  @click="sleepTrendMetric = o.metric"
                >{{ o.name }}</button>
              </template>
            </div>
          </div>
          <p class="text-[11px] leading-relaxed text-slate-500 mb-3">{{ sleepTrend.desc }}</p>
          <TrendPanel :metric="sleepTrend.metric" :color="sleepTrend.color" unit="時間" :date="activeDate" :decimals="1" :zero-based="true" :goal="sleepTrend.goal" goal-label="目安" :format-value="(v) => fmtDuration(Math.round(v * 60))" />
        </div>

        <!-- 就寝・起床の比較（他の日と横並び） -->
        <div class="border-t border-white/[0.06] pt-4">
          <div class="text-xs font-semibold text-slate-400 mb-2">就寝・起床の比較</div>
          <SleepScheduleChart :date="activeDate" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import type { SleepDetail, SleepStage } from '~/types/fitbit'
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import SleepScheduleChart from '~/components/fitbit/SleepScheduleChart.vue'
import { mdWeekday, todayJST } from '~/utils/jst'
import { SLEEP_STAGE_GOAL_MIN, SLEEP_STAGE_LEVELS, sleepStageColor, sleepStageJp } from '~/utils/sleepStage'

const props = defineProps<{ date: string }>()
defineEmits<{ close: [] }>()

// 日送り（推移・就寝起床グラフも activeDate に追随）
const activeDate = ref(props.date || todayJST())
const isToday = computed(() => activeDate.value >= todayJST())
const dateLabel = computed(() => mdWeekday(activeDate.value))

function shiftDay(delta: number) {
  const d = new Date(`${activeDate.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  const next = d.toISOString().slice(0, 10)
  if (next > todayJST()) return
  activeDate.value = next
}

// 睡眠時間の推移: 合計とステージ別を切り替える。goal は SLEEP_STAGE_GOAL_MIN と同じ目安（時間換算）
const SLEEP_TREND_OPTIONS = [
  { metric: 'sleepAsleepHours', name: '合計', label: '睡眠時間の推移（覚醒時間は除く）', color: '#a5b4fc', goal: 7, desc: '中途覚醒を除いた、実際に眠れていた時間の合計です。' },
  { metric: 'sleepDeepHours', name: '深い睡眠', label: '深い睡眠の推移', color: sleepStageColor('deep'), goal: SLEEP_STAGE_GOAL_MIN.deep! / 60, desc: '体の修復や疲労回復が進む眠り。不足すると翌日にだるさが残りがちです。' },
  { metric: 'sleepLightHours', name: '浅い睡眠', label: '浅い睡眠の推移', color: sleepStageColor('light'), goal: SLEEP_STAGE_GOAL_MIN.light! / 60, desc: '睡眠の半分ほどを占める眠り。体を休めながら記憶の定着も進みます。' },
  { metric: 'sleepRemHours', name: 'レム睡眠', label: 'レム睡眠の推移', color: sleepStageColor('rem'), goal: SLEEP_STAGE_GOAL_MIN.rem! / 60, desc: '脳が活発に働き夢を見る眠り。記憶の整理や感情の処理が進みます。' },
] as const

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

const sleepTrendMetric = ref<string>(SLEEP_TREND_OPTIONS[0].metric)
const sleepTrend = computed(() => SLEEP_TREND_OPTIONS.find(o => o.metric === sleepTrendMetric.value) ?? SLEEP_TREND_OPTIONS[0])

const data = ref<SleepDetail | null>(null)
const loading = ref(true)
const refreshing = ref(false)
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

async function load(force = false) {
  // 更新（force）時は表示中の内容を消さず、ボタンだけ回して差し替える
  if (force) refreshing.value = true
  else loading.value = true
  error.value = ''
  try {
    data.value = await $fetch<SleepDetail>('/api/fitbit/sleep', {
      params: { date: activeDate.value, ...(force ? { refresh: 1 } : {}) },
    })
  } catch (e: any) {
    error.value = e?.data?.message || '睡眠データの取得に失敗しました'
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

onMounted(() => load())
watch(activeDate, () => load())
</script>
