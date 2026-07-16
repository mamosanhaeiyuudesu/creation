<template>
  <!-- 認証モーダル -->
  <AuthModal v-if="showAuthModal" accent="sky" />

  <!-- 設定メニューの背景クリックで閉じる -->
  <div v-if="showSettingsMenu" class="fixed inset-0 z-40" @click="showSettingsMenu = false" />

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
          <!-- 歯車（ログアウト・連携解除） -->
          <div class="relative ml-1" @click.stop>
            <button
              class="w-9 h-9 rounded-lg border border-white/10 bg-white/[0.06] text-slate-400 text-base cursor-pointer flex items-center justify-center hover:bg-white/[0.12] hover:text-slate-200 transition-colors"
              title="設定"
              @click="showSettingsMenu = !showSettingsMenu"
            >⚙</button>
            <div v-if="showSettingsMenu" class="absolute right-0 top-full mt-1 bg-[#1e293b] border border-white/10 rounded-xl shadow-xl z-50 min-w-[180px] py-1 overflow-hidden">
              <button
                v-if="!notConnected"
                class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2"
                @click="disconnectFitbit"
              ><span>⌚️</span> Fitbit連携を解除</button>
              <button
                class="w-full text-left px-4 py-2 text-[13px] text-slate-300 hover:bg-white/[0.08] transition-colors cursor-pointer flex items-center gap-2"
                @click="doLogout"
              ><span>🚪</span> ログアウト</button>
            </div>
          </div>
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

      <template v-else-if="isLoggedIn || isDev">
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
              @click="openTrend({ trend: 'energyScore', label: 'エナジースコア', icon: '⚡️', color: '#14b8a6', unit: '', decimals: 0, zeroBased: true })"
            >
              <ScoreGauge :score="data.energyScore.score" label="エナジー" :size="120" from="#34d399" to="#14b8a6" />
              <div class="text-xs text-emerald-300 font-medium">{{ data.energyScore.label }}</div>
              <div class="w-full mt-0.5">
                <Sparkline :points="trendPts('energyScore')" color="#2dd4bf" :h="40" :zero-based="true" />
              </div>
            </button>

            <button
              class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col items-center gap-2 hover:bg-white/[0.06] transition-colors"
              @click="sleepOpen = true"
            >
              <ScoreGauge :score="data.sleepScore.score" label="睡眠スコア" :size="120" from="#818cf8" to="#6366f1" />
              <div class="text-xs text-indigo-300 font-medium flex items-center gap-1.5">
                <span>{{ fmtDuration(data.sleep.asleepMinutes) }}</span>
                <span class="text-indigo-400/60">·</span>
                <span>{{ data.sleepScore.label }}</span>
              </div>
              <div class="w-full mt-0.5">
                <Sparkline :points="trendPts('sleepScore')" color="#818cf8" :h="40" :zero-based="true" />
              </div>
            </button>
          </div>

          <!-- 今日のアドバイス + アクティビティ概要: スマホは縦積み（アドバイスが上）、PCは横並び（アドバイスが左） -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdviceCard :date="date" />

            <button
              class="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 flex flex-col gap-2.5 hover:bg-white/[0.06] transition-colors text-left"
              @click="activityOpen = true"
            >
              <div class="text-xs font-semibold text-slate-400">🏃 アクティビティ</div>
              <div v-if="data.activities.length" class="flex flex-col gap-2">
                <div v-for="(a, i) in data.activities" :key="i" class="flex items-center gap-3">
                  <span class="text-2xl leading-none shrink-0">{{ a.icon }}</span>
                  <div class="min-w-0 flex-1">
                    <div class="text-sm font-semibold text-slate-100">{{ a.label }}</div>
                    <div class="text-[11px] text-slate-500 tabular-nums">{{ a.start }} 〜 {{ a.end }}・{{ a.durationMin }}分</div>
                  </div>
                  <div class="text-sm font-bold text-orange-400 tabular-nums shrink-0">{{ a.caloriesKcal }}<span class="text-[10px] text-slate-500 ml-0.5">kcal</span></div>
                </div>
              </div>
              <div v-else class="text-xs text-slate-600">記録された運動はありません</div>
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
                <Sparkline :points="trendPts(m.trend)" :color="m.color" :h="40" :unit="m.unit" :decimals="m.decimals" :zero-based="true" :axis-range="m.axisRange" :goal="m.goal" :zero-line="m.zeroLine" />
              </div>
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

    <!-- アクティビティ詳細モーダル -->
    <ActivityModal v-if="activityOpen && data" :date="date" @close="activityOpen = false" />

    <!-- メトリクストレンド拡大モーダル -->
    <TrendModal
      v-if="trendModal"
      :metric="trendModal.trend"
      :label="trendModal.label"
      :icon="trendModal.icon"
      :color="trendModal.color"
      :unit="trendModal.unit"
      :decimals="trendModal.decimals"
      :zero-based="trendModal.zeroBased"
      :axis-range="trendModal.axisRange"
      :goal="trendModal.goal"
      :zero-line="trendModal.zeroLine"
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
import ActivityModal from '~/components/fitbit/ActivityModal.vue'
import AdviceCard from '~/components/fitbit/AdviceCard.vue'
import AuthModal from '~/components/AuthModal.vue'
import { useAuth } from '~/composables/useAuth'

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

const isDev = import.meta.dev
const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)
const showSettingsMenu = ref(false)

const todayStr = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)

const date = ref(todayStr())
const data = ref<DashboardData | null>(null)
const loading = ref(true)
const error = ref('')
const notConnected = ref(false)
const sleepOpen = ref(false)
const activityOpen = ref(false)
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
  if (h > 0) return m > 0 ? `${h}時間${m}分` : `${h}時間`
  return `${m}分`
}

function trendPts(key: string): { date: string; value: number | null }[] {
  return data.value?.trends?.[key] ?? []
}

interface MetricRow {
  key: string; icon: string; label: string; value: string | number; unit: string
  color: string; trend: string; decimals: number; axisRange?: [number, number]; goal?: number; zeroLine?: boolean
}

const metrics = computed<MetricRow[]>(() => {
  if (!data.value) return []
  const d = data.value
  return [
    { key: 'steps', icon: '👟', label: `歩数（目標値${d.steps.goal.toLocaleString()}）`, value: d.steps.value.toLocaleString(), unit: '歩', color: '#fbbf24', trend: 'steps', decimals: 0, goal: 8000 },
    { key: 'distanceKm', icon: '📍', label: '移動距離', value: d.distanceKm.toFixed(1), unit: 'km', color: '#a3e635', trend: 'distanceKm', decimals: 1, goal: 6 },
    { key: 'caloriesKcal', icon: '🔥', label: '消費カロリー', value: d.caloriesKcal.toLocaleString(), unit: 'kcal', color: '#f97316', trend: 'caloriesKcal', decimals: 0, goal: 2500 },
    { key: 'restingHeartRate', icon: '❤️', label: '安静時心拍', value: d.restingHeartRate, unit: 'bpm', color: '#f87171', trend: 'restingHeartRate', decimals: 0, axisRange: [50, 70] as [number, number] },
    { key: 'hrv', icon: '💓', label: '心拍変動', value: d.hrv, unit: 'ms', color: '#fb7185', trend: 'hrv', decimals: 0, axisRange: [20, 50] as [number, number] },
    { key: 'spo2', icon: '🩸', label: '血中酸素', value: d.spo2.avg, unit: '%', color: '#38bdf8', trend: 'spo2', decimals: 0, axisRange: [90, 100] as [number, number] },
    { key: 'breathingRate', icon: '🫁', label: '呼吸数', value: d.breathingRate, unit: '回/分', color: '#a78bfa', trend: 'breathingRate', decimals: 1, axisRange: [10, 20] as [number, number] },
    { key: 'skinTempDelta', icon: '🌡️', label: '皮膚温の変動', value: fmtSigned(d.skinTempDelta), unit: '℃', color: '#c084fc', trend: 'skinTempDelta', decimals: 1, axisRange: [-2, 2] as [number, number], zeroLine: true },
  ]
})

/**
 * 内訳グラフを持つメトリクス: dashboard に既にロード済みの当日系列をそのまま渡す（追加fetch不要）。
 * zeroBased は内訳グラフ独自の軸設定（日次トレンドの軸とは別）。
 * 歩数・距離・カロリーは0起点、心拍数は変動が大きいのでデータ範囲に自動フィットさせる。
 */
function intradayFor(trend: string): { points: TimePoint[]; label: string; zeroBased: boolean } | undefined {
  if (!data.value) return undefined
  if (trend === 'steps') return { points: data.value.stepsSeries, label: '時間別（1時間ごと）', zeroBased: true }
  if (trend === 'distanceKm') return { points: data.value.distanceSeries, label: '時間別（1時間ごと）', zeroBased: true }
  if (trend === 'caloriesKcal') return { points: data.value.caloriesSeries, label: '時間別（1時間ごと・推計）', zeroBased: true }
  if (trend === 'restingHeartRate') return { points: data.value.heartRateSeries, label: '心拍数（5分間隔）', zeroBased: false }
  return undefined
}

function openTrend(m: any) {
  // 既定で下限0（zeroBased）。血中酸素・呼吸数・皮膚温は固定レンジ（axisRange）を優先。
  trendModal.value = { trend: m.trend, label: m.label, icon: m.icon, color: m.color, unit: m.unit, decimals: m.decimals ?? 0, zeroBased: m.zeroBased ?? true, axisRange: m.axisRange ?? null, goal: m.goal ?? null, zeroLine: m.zeroLine ?? false, intraday: intradayFor(m.trend) }
}

function fmtSigned(v: number): string {
  const s = v.toFixed(1)
  return v > 0 ? `+${s}` : s
}

async function load() {
  loading.value = true
  error.value = ''
  notConnected.value = false
  try {
    data.value = await $fetch<DashboardData>('/api/fitbit/dashboard', { params: { date: date.value } })
  } catch (e: any) {
    const status = e?.response?.status || e?.statusCode
    if (status === 428) notConnected.value = true
    else if (status === 401) user.value = null // セッション切れ→再ログインモーダルを出す
    else error.value = e?.data?.message || 'データの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

async function disconnectFitbit() {
  showSettingsMenu.value = false
  await $fetch('/api/fitbit/disconnect', { method: 'POST' })
  data.value = null
  notConnected.value = true
}

async function doLogout() {
  showSettingsMenu.value = false
  await logout()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value || isDev) load()
  else loading.value = false
})
watch(date, load)
watch(isLoggedIn, (v) => { if (v) load() })
</script>
