<template>
  <div class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4">
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
    <TrendPanel :metric="sleepTrend.metric" :color="sleepTrend.color" unit="時間" :date="date" :decimals="1" :zero-based="true" :goal="sleepTrend.goal" goal-label="目安" :format-value="(v) => fmtDuration(Math.round(v * 60))" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import TrendPanel from '~/components/fitbit/TrendPanel.vue'
import { SLEEP_STAGE_GOAL_MIN, sleepStageColor } from '~/utils/sleepStage'

defineProps<{ date: string }>()

// 睡眠時間の推移: 合計とステージ別を切り替える。goal は SLEEP_STAGE_GOAL_MIN と同じ目安（時間換算）
const SLEEP_TREND_OPTIONS = [
  { metric: 'sleepAsleepHours', name: '合計', label: '睡眠時間の推移（覚醒時間は除く）', color: '#a5b4fc', goal: 7, desc: '中途覚醒を除いた、実際に眠れていた時間の合計です。' },
  { metric: 'sleepDeepHours', name: '深い睡眠', label: '深い睡眠の推移', color: sleepStageColor('deep'), goal: SLEEP_STAGE_GOAL_MIN.deep! / 60, desc: '体の修復や疲労回復が進む眠り。不足すると翌日にだるさが残りがちです。' },
  { metric: 'sleepLightHours', name: '浅い睡眠', label: '浅い睡眠の推移', color: sleepStageColor('light'), goal: SLEEP_STAGE_GOAL_MIN.light! / 60, desc: '睡眠の半分ほどを占める眠り。体を休めながら記憶の定着も進みます。' },
  { metric: 'sleepRemHours', name: 'レム睡眠', label: 'レム睡眠の推移', color: sleepStageColor('rem'), goal: SLEEP_STAGE_GOAL_MIN.rem! / 60, desc: '脳が活発に働き夢を見る眠り。記憶の整理や感情の処理が進みます。' },
] as const

const sleepTrendMetric = ref<string>(SLEEP_TREND_OPTIONS[0].metric)
const sleepTrend = computed(() => SLEEP_TREND_OPTIONS.find(o => o.metric === sleepTrendMetric.value) ?? SLEEP_TREND_OPTIONS[0])

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h > 0) return m > 0 ? `${h}時間${m}分` : `${h}時間`
  return `${m}分`
}
</script>
