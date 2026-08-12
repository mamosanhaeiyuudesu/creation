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
        <!-- 就寝・起床の比較（他の日と横並び） -->
        <div>
          <div class="text-xs font-semibold text-slate-400 mb-2">就寝・起床の比較</div>
          <SleepScheduleChart :date="activeDate" />
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { SleepDetail } from '~/types/fitbit'
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import SleepScheduleChart from '~/components/fitbit/SleepScheduleChart.vue'
import { mdWeekday, todayJST } from '~/utils/jst'
import { SLEEP_STAGE_GOAL_MIN, sleepStageColor } from '~/utils/sleepStage'

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

const sleepTrendMetric = ref<string>(SLEEP_TREND_OPTIONS[0].metric)
const sleepTrend = computed(() => SLEEP_TREND_OPTIONS.find(o => o.metric === sleepTrendMetric.value) ?? SLEEP_TREND_OPTIONS[0])

const data = ref<SleepDetail | null>(null)
const loading = ref(true)
const refreshing = ref(false)
const error = ref('')

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
