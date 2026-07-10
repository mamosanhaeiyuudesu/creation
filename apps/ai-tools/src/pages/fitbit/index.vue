<template>
  <div class="min-h-full px-4 pt-4 pb-20 flex flex-col items-center">
    <div class="w-full max-w-[640px] flex flex-col gap-4">
      <!-- ヘッダー -->
      <header class="flex items-center justify-between pt-1">
        <h1 class="text-lg font-bold bg-gradient-to-br from-emerald-400 to-teal-500 bg-clip-text text-transparent">Fitbit</h1>
        <div class="flex items-center gap-1">
          <button class="w-9 h-9 rounded-lg text-slate-300 text-xl hover:bg-white/10 flex items-center justify-center" @click="shiftDate(-1)">‹</button>
          <span class="text-sm font-semibold text-slate-200 min-w-[132px] text-center tabular-nums">{{ dateLabel }}</span>
          <button
            class="w-9 h-9 rounded-lg text-xl flex items-center justify-center"
            :class="isToday ? 'text-slate-700 cursor-default' : 'text-slate-300 hover:bg-white/10'"
            :disabled="isToday"
            @click="shiftDate(1)"
          >›</button>
        </div>
      </header>

      <!-- 連携エラー（callbackから ?fitbit_error= で渡ってくる） -->
      <div v-if="connectError" class="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200 break-all">
        <div class="font-semibold mb-1">Fitbit連携エラー</div>{{ connectError }}
      </div>

      <!-- 未連携 -->
      <div v-if="notConnected" class="mt-10 flex flex-col items-center gap-5 text-center">
        <div class="text-5xl">⌚️</div>
        <p class="text-slate-400 text-sm max-w-[280px]">Fitbitアカウントと連携すると、あなたの健康データがここに表示されます。</p>
        <a href="/api/fitbit/connect" class="px-6 py-3 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-sm font-semibold hover:opacity-90">Fitbitと連携する</a>
      </div>

      <div v-else-if="needLogin" class="mt-10 text-center text-slate-400 text-sm">このページを見るにはログインが必要です。</div>

      <template v-else>
        <div v-if="loading" class="mt-16 text-center text-slate-500 text-sm animate-pulse">読み込み中…</div>
        <div v-else-if="error" class="mt-16 text-center text-rose-400 text-sm">{{ error }}</div>

        <template v-else-if="data">
          <p v-if="data.energyScore.provisional" class="text-[11px] text-amber-400/80 text-center -mt-1">
            ※ 使い始めのためベースライン蓄積中。スコアは数日後に精度が上がります。
          </p>

          <!-- 上段: 2大スコア（数値 + 7日推移スパークライン） -->
          <div class="grid grid-cols-2 gap-3">
            <button
              class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col items-center gap-2 hover:bg-white/[0.06] transition-colors"
              @click="openTrend({ trend: 'energyScore', label: 'エナジースコア', icon: '⚡️', color: '#14b8a6', unit: '', decimals: 0 })"
            >
              <ScoreGauge :score="data.energyScore.score" label="エナジー" :size="120" from="#34d399" to="#14b8a6" />
              <div class="text-xs text-emerald-300 font-medium">{{ data.energyScore.label }}</div>
              <div class="w-full mt-0.5">
                <Sparkline :points="trendPts('energyScore')" color="#2dd4bf" :h="28" />
              </div>
            </button>

            <button
              class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col items-center gap-2 hover:bg-white/[0.06] transition-colors"
              @click="sleepOpen = true"
            >
              <ScoreGauge :score="data.sleepScore.score" label="睡眠" :size="120" from="#818cf8" to="#6366f1" />
              <div class="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                <span>{{ fmtDuration(data.sleep.totalMinutes) }}</span>
                <span class="text-indigo-400/60">·</span>
                <span>{{ data.sleepScore.label }}</span>
              </div>
              <div class="w-full mt-0.5">
                <Sparkline :points="trendPts('sleepScore')" color="#818cf8" :h="28" />
              </div>
            </button>
          </div>

          <!-- 下段: メトリクスグリッド（数値 + 7日スパークライン） -->
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button
              v-for="m in metrics"
              :key="m.key"
              class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 flex flex-col gap-1.5 hover:bg-white/[0.06] transition-colors text-left"
              @click="m.trend && openTrend(m)"
            >
              <div class="flex items-center gap-1.5 text-[11px] text-slate-400"><span>{{ m.icon }}</span>{{ m.label }}</div>
              <div class="flex items-baseline gap-1">
                <span class="text-xl font-bold tabular-nums" :style="{ color: m.color }">{{ m.value }}</span>
                <span class="text-[10px] text-slate-500">{{ m.unit }}</span>
              </div>
              <div v-if="m.trend" class="w-full">
                <Sparkline :points="trendPts(m.trend)" :color="m.color" :h="26" :unit="m.unit" />
              </div>
              <div v-if="m.sub" class="text-[10px] text-slate-500">{{ m.sub }}</div>
            </button>
          </div>

          <p class="text-[10px] text-slate-600 text-center mt-2 leading-relaxed">
            エナジー／睡眠スコアはFitbit公式APIでは提供されないため、取得可能な指標から独自に近似算出しています。
          </p>
        </template>
      </template>
    </div>

    <!-- 睡眠詳細モーダル -->
    <SleepModal v-if="sleepOpen && data" :date="date" @close="sleepOpen = false" />

    <!-- メトリクストレンド拡大モーダル -->
    <TrendModal
      v-if="trendModal"
      :metric="trendModal.trend"
      :label="trendModal.label"
      :icon="trendModal.icon"
      :color="trendModal.color"
      :unit="trendModal.unit"
      :decimals="trendModal.decimals"
      :date="date"
      :intraday="trendModal.intraday"
      @close="trendModal = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { DashboardData, TimePoint } from '~/types/fitbit'
import ScoreGauge from '~/components/fitbit/ScoreGauge.vue'
import Sparkline from '~/components/fitbit/Sparkline.vue'
import SleepModal from '~/components/fitbit/SleepModal.vue'
import TrendModal from '~/components/fitbit/TrendModal.vue'

useHead({
  title: 'Fitbit ヘルスダッシュボード',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⌚️</text></svg>` },
    { rel: 'manifest', href: '/manifest-fitbit.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-fitbit.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'Fitbit' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#0d9488' },
  ],
})

const route = useRoute()
const connectError = computed(() => (route.query.fitbit_error as string) || '')

const todayStr = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

const date = ref(todayStr())
const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')
const notConnected = ref(false)
const needLogin = ref(false)
const sleepOpen = ref(false)
const trendModal = ref<any>(null)

const isToday = computed(() => date.value >= todayStr())
const dateLabel = computed(() => {
  const d = new Date(`${date.value}T00:00:00Z`)
  const w = ['日', '月', '火', '水', '木', '金', '土'][d.getUTCDay()]
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${w})`
})

function shiftDate(delta: number) {
  const d = new Date(`${date.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  const next = d.toISOString().slice(0, 10)
  if (next > todayStr()) return
  date.value = next
}

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

function trendPts(key: string): { date: string; value: number | null }[] {
  return data.value?.trends?.[key] ?? []
}

const metrics = computed(() => {
  if (!data.value) return []
  const d = data.value
  return [
    { key: 'steps', icon: '👟', label: '歩数', value: d.steps.value.toLocaleString(), unit: '歩', sub: `目標 ${d.steps.goal.toLocaleString()}`, color: '#fbbf24', trend: 'steps', decimals: 0 },
    { key: 'distanceKm', icon: '📍', label: '移動距離', value: d.distanceKm.toFixed(1), unit: 'km', sub: '', color: '#a3e635', trend: 'distanceKm', decimals: 1 },
    { key: 'caloriesKcal', icon: '🔥', label: '消費カロリー', value: d.caloriesKcal.toLocaleString(), unit: 'kcal', sub: '', color: '#f97316', trend: 'caloriesKcal', decimals: 0 },
    { key: 'restingHeartRate', icon: '❤️', label: '安静時心拍', value: d.restingHeartRate, unit: 'bpm', sub: '', color: '#f87171', trend: 'restingHeartRate', decimals: 0 },
    { key: 'hrv', icon: '💓', label: '心拍変動', value: d.hrv, unit: 'ms', sub: '', color: '#fb7185', trend: 'hrv', decimals: 0 },
    { key: 'spo2', icon: '🩸', label: '血中酸素', value: d.spo2.avg, unit: '%', sub: `${d.spo2.min}〜${d.spo2.max}%`, color: '#38bdf8', trend: 'spo2', decimals: 0 },
    { key: 'breathingRate', icon: '🫁', label: '呼吸数', value: d.breathingRate, unit: '回/分', sub: '', color: '#a78bfa', trend: 'breathingRate', decimals: 1 },
    { key: 'skinTempDelta', icon: '🌡️', label: '皮膚温の変動', value: fmtSigned(d.skinTempDelta), unit: '℃', sub: '基準比', color: '#c084fc', trend: 'skinTempDelta', decimals: 1 },
  ]
})

/** 内訳グラフを持つメトリクス: dashboard に既にロード済みの当日系列をそのまま渡す（追加fetch不要） */
function intradayFor(trend: string): { points: TimePoint[]; label: string } | undefined {
  if (!data.value) return undefined
  if (trend === 'steps') return { points: data.value.stepsSeries, label: '時間別（1時間ごと）' }
  if (trend === 'distanceKm') return { points: data.value.distanceSeries, label: '時間別（1時間ごと）' }
  if (trend === 'restingHeartRate') return { points: data.value.heartRateSeries, label: '心拍数（5分間隔）' }
  return undefined
}

function openTrend(m: any) {
  trendModal.value = { trend: m.trend, label: m.label, icon: m.icon, color: m.color, unit: m.unit, decimals: m.decimals ?? 0, intraday: intradayFor(m.trend) }
}

function fmtSigned(v: number): string {
  const s = v.toFixed(1)
  return v > 0 ? `+${s}` : s
}

async function load() {
  loading.value = true
  error.value = ''
  notConnected.value = false
  needLogin.value = false
  try {
    data.value = await $fetch<DashboardData>('/api/fitbit/dashboard', { params: { date: date.value } })
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    if (status === 428) notConnected.value = true
    else if (status === 401) needLogin.value = true
    else error.value = e?.data?.message || 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(date, load)
</script>
