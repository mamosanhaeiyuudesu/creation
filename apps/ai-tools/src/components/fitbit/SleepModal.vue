<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[560px] max-h-[92dvh] overflow-y-auto bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl [scrollbar-width:thin]">
      <!-- ハンドル / 日送り / 閉じる -->
      <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[#0f172a]/95 backdrop-blur border-b border-white/[0.06]">
        <h2 class="text-sm font-bold text-slate-100">睡眠スコア</h2>
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center" @click="shiftDay(-1)">‹</button>
          <span class="text-xs font-semibold text-slate-200 min-w-[76px] text-center tabular-nums">{{ dateLabel }}</span>
          <button
            class="w-7 h-7 rounded-lg flex items-center justify-center"
            :class="isToday ? 'text-slate-700 cursor-default' : 'text-slate-300 hover:bg-white/10'"
            :disabled="isToday"
            @click="shiftDay(1)"
          >›</button>
          <button class="w-8 h-8 ml-1 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center text-slate-500 text-sm">読み込み中…</div>
      <div v-else-if="error" class="p-10 text-center text-rose-400 text-sm">{{ error }}</div>

      <div v-else-if="data" class="p-5 flex flex-col gap-6">
        <!-- スコア + 総睡眠 -->
        <div class="flex items-center gap-5">
          <ScoreGauge :score="data.score.score" label="睡眠スコア" :size="108" from="#818cf8" to="#6366f1" />
          <div class="flex flex-col gap-1">
            <div class="text-2xl font-bold text-slate-100 tabular-nums">{{ fmtDuration(data.totalMinutes) }}</div>
            <div class="text-sm text-slate-400">{{ data.bedtime }} → {{ data.waketime }}</div>
            <div class="text-xs text-indigo-300 mt-0.5">{{ data.score.label }}</div>
            <div class="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400">
              <span>睡眠効率 <span class="font-semibold text-slate-200 tabular-nums">{{ data.efficiency }}%</span></span>
              <span class="text-slate-700">|</span>
              <span>中途覚醒 <span class="font-semibold text-slate-200 tabular-nums">{{ data.awakeCount }}回</span></span>
            </div>
            <div v-if="data.score.provisional" class="text-[10px] text-amber-400/80 mt-1">※ ベースライン蓄積中のため参考値</div>
          </div>
        </div>

        <!-- ヒプノグラム（ステージ帯 + 内訳: 左にラベル、右に時間/割合） -->
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-2">睡眠ステージ</div>
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
            <div ref="hypWrap" class="relative flex-1 min-w-0" @pointermove="onHypMove" @pointerleave="hoverSeg = null">
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
            <!-- 右: 時間・割合 -->
            <div class="relative shrink-0 w-24" :style="{ height: `${hypH}px` }">
              <div
                v-for="(lv, i) in stageLevels"
                :key="lv.stage"
                class="absolute right-0 flex items-center justify-end text-[10px] text-slate-400 tabular-nums whitespace-nowrap"
                :style="{ top: `${rowY(i)}px`, height: `${rowH}px` }"
              >
                {{ fmtDuration(data.stages[lv.stage].minutes) }} / {{ data.stages[lv.stage].pct }}%
              </div>
            </div>
          </div>
        </div>

        <!-- 睡眠スコアの推移（7日 / 1か月 / 3か月） -->
        <div class="border-t border-white/[0.06] pt-4">
          <div class="text-xs font-semibold text-slate-400 mb-2">睡眠スコアの推移</div>
          <TrendPanel metric="sleepScore" color="#818cf8" :date="activeDate" :decimals="0" :zero-based="true" />
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
import { ref, computed, watch, onMounted } from 'vue'
import type { SleepDetail, SleepStage } from '~/types/fitbit'
import ScoreGauge from '~/components/fitbit/ScoreGauge.vue'
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import SleepScheduleChart from '~/components/fitbit/SleepScheduleChart.vue'
import { mdWeekday, todayJST } from '~/utils/jst'
import { SLEEP_STAGE_LEVELS, sleepStageColor, sleepStageJp } from '~/utils/sleepStage'

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

// ヒプノグラムのホバー
type Seg = SleepDetail['timeline'][number]
const hypWrap = ref<HTMLElement>()
const hoverSeg = ref<Seg | null>(null)
const hoverX = ref(0)

function onHypMove(e: PointerEvent) {
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
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    data.value = await $fetch<SleepDetail>('/api/fitbit/sleep', { params: { date: activeDate.value } })
  } catch (e: any) {
    error.value = e?.data?.message || '睡眠データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(activeDate, load)
</script>
