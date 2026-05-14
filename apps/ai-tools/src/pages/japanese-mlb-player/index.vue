<script setup lang="ts">
import type { SeasonData, YearlyData } from '~/types/mlb'
import { PLAYERS, PITCHER_PLAYERS, BATTER_PLAYERS, PLAYER_COLORS } from '~/utils/japanese-mlb-player/players'
import MlbHeader from '~/components/japanese-mlb-player/MlbHeader.vue'
import PlayerSidebar from '~/components/japanese-mlb-player/PlayerSidebar.vue'
import RecentGames from '~/components/japanese-mlb-player/RecentGames.vue'
import StatsTable from '~/components/japanese-mlb-player/StatsTable.vue'
import TrendChart from '~/components/japanese-mlb-player/TrendChart.vue'
import YearlyChart from '~/components/japanese-mlb-player/YearlyChart.vue'

definePageMeta({ ssr: false, layout: 'japanese-mlb-player' })

useHead({
  title: import.meta.dev ? 'MLB日本人選手成績 (dev)' : 'MLB日本人選手成績',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚾</text></svg>` },
    { rel: 'manifest', href: '/manifest-mlb.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-mlb.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'MLB日本人選手' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#1e3a8a' },
  ],
})

const tabs = [
  { key: 'speed' as const, label: '速報' },
  { key: 'season' as const, label: '今シーズン' },
  { key: 'yearly' as const, label: '年度別' },
]

const route = useRoute()
const router = useRouter()

const settingsOpen = ref(false)
const mainRef = ref<HTMLElement | null>(null)
const pcView = ref<'table' | 'trend'>('table')
const mobileView = ref<'table' | 'trend'>('table')

const {
  selectedIds,
  activeTab,
  lastSyncedAt,
  hasFailed,
  togglePlayer,
  fetchMeta,
  ensureSeasonData,
  ensureYearlyData,
  retryFailed,
  getSeasonData,
  getYearlyData,
  getLeagueStats,
} = useMlbStats()

const isRetrying = ref(false)
async function handleRetry() {
  isRetrying.value = true
  try { await retryFailed() } finally { isRetrying.value = false }
}

watch(activeTab, (tab) => {
  const query: Record<string, string> = {}
  if (tab !== 'speed') query.tab = tab
  router.replace({ query })
})

const leagueStats = computed(() => getLeagueStats())

const seasonDataMap = computed(() => {
  const m = new Map<string, SeasonData>()
  for (const id of selectedIds.value) {
    const d = getSeasonData(id)
    if (d) m.set(id, d)
  }
  return m
})

const yearlyDataMap = computed(() => {
  const m = new Map<string, YearlyData>()
  for (const id of selectedIds.value) {
    const d = getYearlyData(id)
    if (d) m.set(id, d)
  }
  return m
})

const nlPitcherIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === 'NL' && (p?.position === 'pitcher' || p?.position === 'both')
  })
)
const nlBatterIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === 'NL' && (p?.position === 'batter' || p?.position === 'both')
  })
)
const alPitcherIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === 'AL' && (p?.position === 'pitcher' || p?.position === 'both')
  })
)
const alBatterIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === 'AL' && (p?.position === 'batter' || p?.position === 'both')
  })
)

// モバイル設定パネル用プレイヤーリスト
const nlPitchers = computed(() => PITCHER_PLAYERS.filter(p => p.league === 'NL'))
const nlBatters  = computed(() => BATTER_PLAYERS.filter(p => p.league === 'NL'))
const alPitchers = computed(() => PITCHER_PLAYERS.filter(p => p.league === 'AL'))
const alBatters  = computed(() => BATTER_PLAYERS.filter(p => p.league === 'AL'))

watch(activeTab, async (tab) => {
  if (tab === 'yearly') await ensureYearlyData()
  else await ensureSeasonData()
})

watch(selectedIds, async () => {
  if (activeTab.value === 'yearly') await ensureYearlyData()
  else await ensureSeasonData()
}, { deep: true })

onMounted(async () => {
  fetchMeta()
  if (route.query.tab === 'season') {
    activeTab.value = 'season'
    await ensureSeasonData()
  } else if (route.query.tab === 'yearly') {
    activeTab.value = 'yearly'
    await ensureYearlyData()
  } else {
    activeTab.value = 'speed'
    await ensureSeasonData()
  }
})
</script>

<template>
  <MlbHeader :last-updated="lastSyncedAt" />

  <div class="flex flex-1 overflow-hidden">
    <PlayerSidebar
      class="hidden md:flex"
      :selected-ids="selectedIds"
      :view="pcView"
      :show-view-toggle="activeTab !== 'speed'"
      @toggle="togglePlayer"
      @update:view="pcView = $event"
    />

    <main ref="mainRef" class="flex-1 overflow-y-auto bg-white">
      <!-- タブバー（PC・モバイル共通） -->
      <div class="flex border-b border-slate-200 bg-white sticky top-0 z-20 items-end">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="flex-1 md:flex-none md:px-5 py-2.5 text-xs md:text-sm font-medium transition-colors duration-150 border-b-2 -mb-px text-center"
          :class="activeTab === tab.key
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
        >{{ tab.label }}</button>

        <!-- 1〜10位の凡例 -->
        <span class="ml-auto flex items-center px-3 pb-2.5 text-[10px] md:text-[11px] whitespace-nowrap" style="color: #C42121;">
          1〜10位は赤文字
        </span>

        <!-- 歯車ボタン（モバイルのみ） -->
        <button
          class="md:hidden flex-none px-3 py-2.5 text-slate-400 hover:text-slate-600 border-b-2 border-transparent -mb-px transition-colors"
          @click="settingsOpen = true"
          aria-label="選手・表示設定"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      <!-- エラーバナー -->
      <div v-if="hasFailed" class="mx-5 mt-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded text-sm text-amber-700 flex items-center justify-between">
        <span>一部のデータを取得できませんでした</span>
        <button
          @click="handleRetry"
          :disabled="isRetrying"
          class="text-xs font-medium text-amber-800 hover:text-amber-900 underline disabled:opacity-50"
        >{{ isRetrying ? '再試行中...' : '再試行' }}</button>
      </div>

      <!-- コンテンツ -->
      <div class="p-5">

        <!-- ===== モバイル ===== -->
        <div class="md:hidden">
          <!-- 速報 -->
          <template v-if="activeTab === 'speed'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              右上の歯車ボタンから選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ナ・リーグ 投手 <span class="text-xs font-normal text-slate-400">（直近3試合）</span>
                </h2>
                <RecentGames :player-ids="nlPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" league="NL" :league-stats="leagueStats" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ナ・リーグ 野手 <span class="text-xs font-normal text-slate-400">（直近6試合）</span>
                </h2>
                <RecentGames :player-ids="nlBatterIds" :season-data-map="seasonDataMap" mode="batter" league="NL" :league-stats="leagueStats" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ア・リーグ 投手 <span class="text-xs font-normal text-slate-400">（直近3試合）</span>
                </h2>
                <RecentGames :player-ids="alPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" league="AL" :league-stats="leagueStats" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ア・リーグ 野手 <span class="text-xs font-normal text-slate-400">（直近6試合）</span>
                </h2>
                <RecentGames :player-ids="alBatterIds" :season-data-map="seasonDataMap" mode="batter" league="AL" :league-stats="leagueStats" />
              </section>
            </template>
          </template>

          <!-- 今シーズン -->
          <template v-else-if="activeTab === 'season'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              右上の歯車ボタンから選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <StatsTable v-if="mobileView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="pitcher" />
                <TrendChart v-else :selected-ids="nlPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <StatsTable v-if="mobileView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="batter" />
                <TrendChart v-else :selected-ids="nlBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <StatsTable v-if="mobileView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="pitcher" />
                <TrendChart v-else :selected-ids="alPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <StatsTable v-if="mobileView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="batter" />
                <TrendChart v-else :selected-ids="alBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
            </template>
          </template>

          <!-- 年度別 -->
          <template v-else-if="activeTab === 'yearly'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              右上の歯車ボタンから選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <YearlyChart :selected-ids="nlPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="mobileView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <YearlyChart :selected-ids="nlBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="mobileView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <YearlyChart :selected-ids="alPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="mobileView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <YearlyChart :selected-ids="alBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="mobileView === 'trend' ? 'chart' : 'table'" />
              </section>
            </template>
          </template>
        </div>

        <!-- ===== PC: サイドバーで表示切り替え ===== -->
        <div class="hidden md:block">
          <!-- 速報 -->
          <template v-if="activeTab === 'speed'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ナ・リーグ 投手 <span class="text-xs font-normal text-slate-400">（直近3試合）</span>
                </h2>
                <RecentGames :player-ids="nlPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" league="NL" :league-stats="leagueStats" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ナ・リーグ 野手 <span class="text-xs font-normal text-slate-400">（直近6試合）</span>
                </h2>
                <RecentGames :player-ids="nlBatterIds" :season-data-map="seasonDataMap" mode="batter" league="NL" :league-stats="leagueStats" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ア・リーグ 投手 <span class="text-xs font-normal text-slate-400">（直近3試合）</span>
                </h2>
                <RecentGames :player-ids="alPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" league="AL" :league-stats="leagueStats" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  ア・リーグ 野手 <span class="text-xs font-normal text-slate-400">（直近6試合）</span>
                </h2>
                <RecentGames :player-ids="alBatterIds" :season-data-map="seasonDataMap" mode="batter" league="AL" :league-stats="leagueStats" />
              </section>
            </template>
          </template>

          <!-- 今シーズン -->
          <template v-else-if="activeTab === 'season'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <StatsTable v-if="pcView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="pitcher" />
                <TrendChart v-else :selected-ids="nlPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <StatsTable v-if="pcView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="batter" />
                <TrendChart v-else :selected-ids="nlBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <StatsTable v-if="pcView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="pitcher" />
                <TrendChart v-else :selected-ids="alPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <StatsTable v-if="pcView === 'table'" :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="batter" />
                <TrendChart v-else :selected-ids="alBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
            </template>
          </template>

          <!-- 年度別推移 -->
          <template v-else-if="activeTab === 'yearly'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <YearlyChart :selected-ids="nlPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="pcView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <YearlyChart :selected-ids="nlBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="pcView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <YearlyChart :selected-ids="alPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="pcView === 'trend' ? 'chart' : 'table'" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <YearlyChart :selected-ids="alBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="pcView === 'trend' ? 'chart' : 'table'" />
              </section>
            </template>
          </template>
        </div>

      </div>
    </main>
  </div>

  <!-- ===== モバイル設定パネル（ボトムシート） ===== -->
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 [&>*:last-child]:translate-y-full"
      enter-to-class="opacity-100 [&>*:last-child]:translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 [&>*:last-child]:translate-y-0"
      leave-to-class="opacity-0 [&>*:last-child]:translate-y-full"
    >
      <div
        v-if="settingsOpen"
        class="fixed inset-0 z-50 md:hidden"
      >
        <!-- 背景オーバーレイ -->
        <div class="absolute inset-0 bg-black/40" @click="settingsOpen = false" />

        <!-- パネル本体 -->
          <div
            class="absolute inset-x-0 bottom-0 bg-white rounded-t-2xl flex flex-col transition-transform duration-300"
            style="max-height: 85dvh;"
          >
            <!-- ヘッダー -->
            <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 flex-shrink-0">
              <span class="text-sm font-bold text-slate-800">選手・表示設定</span>
              <div class="flex items-center gap-2">
                <span class="text-xs text-slate-400">{{ selectedIds.length }}名選択中</span>
                <button
                  @click="settingsOpen = false"
                  class="w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <!-- 選手リスト（2カラム） -->
            <div class="flex flex-1 overflow-hidden">
              <!-- ナ・リーグ -->
              <div class="flex-1 overflow-y-auto border-r border-slate-100">
                <div class="px-3 pt-3 pb-1">
                  <p class="text-[11px] font-bold text-blue-700 tracking-wide mb-2">ナ・リーグ</p>
                  <div v-if="nlPitchers.length" class="mb-3">
                    <p class="text-[10px] font-semibold text-slate-400 mb-1 px-1">投手</p>
                    <ul class="flex flex-col gap-0.5">
                      <li
                        v-for="player in nlPitchers"
                        :key="player.id"
                        @click="togglePlayer(player.id)"
                        class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors select-none"
                        :class="selectedIds.includes(player.id) ? 'bg-blue-50' : 'active:bg-slate-50'"
                      >
                        <span
                          class="w-2 h-2 rounded-full flex-shrink-0"
                          :style="{ background: selectedIds.includes(player.id) ? PLAYER_COLORS[player.id] : '#CBD5E1' }"
                        />
                        <span class="text-xs text-slate-700 flex-1 min-w-0 truncate leading-tight">{{ player.nameJa }}</span>
                        <span class="text-[10px] text-slate-400 flex-shrink-0">{{ player.team }}</span>
                      </li>
                    </ul>
                  </div>
                  <div v-if="nlBatters.length">
                    <p class="text-[10px] font-semibold text-slate-400 mb-1 px-1">野手</p>
                    <ul class="flex flex-col gap-0.5">
                      <li
                        v-for="player in nlBatters"
                        :key="player.id"
                        @click="togglePlayer(player.id)"
                        class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors select-none"
                        :class="selectedIds.includes(player.id) ? 'bg-blue-50' : 'active:bg-slate-50'"
                      >
                        <span
                          class="w-2 h-2 rounded-full flex-shrink-0"
                          :style="{ background: selectedIds.includes(player.id) ? PLAYER_COLORS[player.id] : '#CBD5E1' }"
                        />
                        <span class="text-xs text-slate-700 flex-1 min-w-0 truncate leading-tight">{{ player.nameJa }}</span>
                        <span class="text-[10px] text-slate-400 flex-shrink-0">{{ player.team }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <!-- ア・リーグ -->
              <div class="flex-1 overflow-y-auto">
                <div class="px-3 pt-3 pb-1">
                  <p class="text-[11px] font-bold text-blue-700 tracking-wide mb-2">ア・リーグ</p>
                  <div v-if="alPitchers.length" class="mb-3">
                    <p class="text-[10px] font-semibold text-slate-400 mb-1 px-1">投手</p>
                    <ul class="flex flex-col gap-0.5">
                      <li
                        v-for="player in alPitchers"
                        :key="player.id"
                        @click="togglePlayer(player.id)"
                        class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors select-none"
                        :class="selectedIds.includes(player.id) ? 'bg-blue-50' : 'active:bg-slate-50'"
                      >
                        <span
                          class="w-2 h-2 rounded-full flex-shrink-0"
                          :style="{ background: selectedIds.includes(player.id) ? PLAYER_COLORS[player.id] : '#CBD5E1' }"
                        />
                        <span class="text-xs text-slate-700 flex-1 min-w-0 truncate leading-tight">{{ player.nameJa }}</span>
                        <span class="text-[10px] text-slate-400 flex-shrink-0">{{ player.team }}</span>
                      </li>
                    </ul>
                  </div>
                  <div v-if="alBatters.length">
                    <p class="text-[10px] font-semibold text-slate-400 mb-1 px-1">野手</p>
                    <ul class="flex flex-col gap-0.5">
                      <li
                        v-for="player in alBatters"
                        :key="player.id"
                        @click="togglePlayer(player.id)"
                        class="flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition-colors select-none"
                        :class="selectedIds.includes(player.id) ? 'bg-blue-50' : 'active:bg-slate-50'"
                      >
                        <span
                          class="w-2 h-2 rounded-full flex-shrink-0"
                          :style="{ background: selectedIds.includes(player.id) ? PLAYER_COLORS[player.id] : '#CBD5E1' }"
                        />
                        <span class="text-xs text-slate-700 flex-1 min-w-0 truncate leading-tight">{{ player.nameJa }}</span>
                        <span class="text-[10px] text-slate-400 flex-shrink-0">{{ player.team }}</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <!-- 表示切り替え -->
            <div class="px-4 py-3 border-t border-slate-200 flex-shrink-0">
              <p class="text-xs font-semibold text-slate-500 mb-2">表示</p>
              <div class="flex rounded-lg overflow-hidden border border-slate-200">
                <button
                  v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]"
                  :key="v.key"
                  @click="mobileView = v.key as 'table' | 'trend'"
                  class="flex-1 py-2 text-sm font-medium transition-colors"
                  :class="mobileView === v.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'"
                >{{ v.label }}</button>
              </div>
            </div>
          </div>
      </div>
    </Transition>
  </Teleport>
</template>
