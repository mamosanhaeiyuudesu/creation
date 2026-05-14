<script setup lang="ts">
import type { SeasonData, YearlyData } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'
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

const mobileMenu = ref(false)
const mainRef = ref<HTMLElement | null>(null)
const activeLeague = ref<'AL' | 'NL'>(
  route.query.league === 'AL' ? 'AL' : 'NL'
)

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

const mView = reactive({
  nlPitcherSeason: 'table' as 'table' | 'trend',
  nlBatterSeason: 'table' as 'table' | 'trend',
  alPitcherSeason: 'table' as 'table' | 'trend',
  alBatterSeason: 'table' as 'table' | 'trend',
  nlPitcherYearly: 'table' as 'table' | 'chart',
  nlBatterYearly: 'table' as 'table' | 'chart',
  alPitcherYearly: 'table' as 'table' | 'chart',
  alBatterYearly: 'table' as 'table' | 'chart',
})

watch([activeLeague, activeTab], ([league, tab]) => {
  const query: Record<string, string> = {}
  if (league !== 'NL') query.league = league
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

const leaguePlayers = computed(() => PLAYERS.filter(p => p.league === activeLeague.value))

const pitcherIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === activeLeague.value && (p?.position === 'pitcher' || p?.position === 'both')
  })
)

const batterIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.league === activeLeague.value && (p?.position === 'batter' || p?.position === 'both')
  })
)

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

function openMobileMenu() {
  mobileMenu.value = !mobileMenu.value
  if (mobileMenu.value) {
    nextTick(() => mainRef.value?.scrollTo({ top: 0, behavior: 'smooth' }))
  }
}

async function mobileToggle(id: string) {
  togglePlayer(id)
  mobileMenu.value = false
  await nextTick()
  mainRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

function selectAll() {
  const leagueIds = leaguePlayers.value.map(p => p.id)
  const others = selectedIds.value.filter(id => !leagueIds.includes(id))
  selectedIds.value = [...others, ...leagueIds]
  ensureSeasonData()
}

function deselectAll() {
  const leagueIds = new Set(leaguePlayers.value.map(p => p.id))
  selectedIds.value = selectedIds.value.filter(id => !leagueIds.has(id))
}
</script>

<template>
  <MlbHeader :last-updated="lastSyncedAt" />

  <div class="flex flex-1 overflow-hidden">
    <PlayerSidebar
      class="hidden md:flex"
      :selected-ids="selectedIds"
      :league="activeLeague"
      @toggle="togglePlayer"
      @select-all="selectAll"
      @deselect-all="deselectAll"
      @update:league="activeLeague = $event"
    />

    <main ref="mainRef" class="flex-1 overflow-y-auto bg-white">
      <!-- シーズン/年度別タブ -->
      <div class="flex border-b border-slate-200 bg-white sticky top-0 z-20">
        <!-- PC: タブ -->
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="hidden md:block px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px"
          :class="activeTab === tab.key
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
        >{{ tab.label }}</button>


        <!-- モバイル: select -->
        <div class="flex flex-1 items-center justify-between px-2 md:hidden">
          <select
            :value="activeTab"
            @change="activeTab = ($event.target as HTMLSelectElement).value as 'speed' | 'season' | 'yearly'"
            class="text-xs text-slate-600 border border-slate-200 rounded px-2 py-1.5 bg-white outline-none"
          >
            <option v-for="tab in tabs" :key="tab.key" :value="tab.key">{{ tab.label }}</option>
          </select>
          <button
            class="px-3 py-1.5 text-sm text-slate-500 flex items-center gap-1"
            @click="openMobileMenu"
          >
            <span>選手 {{ selectedIds.length }}</span>
            <span>{{ mobileMenu ? '▴' : '▾' }}</span>
          </button>
        </div>
      </div>

      <!-- モバイル選手メニュー -->
      <div v-if="mobileMenu" class="md:hidden border-b border-blue-700">
        <PlayerSidebar
          :selected-ids="selectedIds"
          :league="activeLeague"
          :closable="true"
          @toggle="mobileToggle"
          @select-all="selectAll"
          @deselect-all="deselectAll"
          @update:league="activeLeague = $event"
          @close="mobileMenu = false"
          style="width: 100%;"
        />
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

        <!-- ===== モバイル: NL→AL順表示 ===== -->
        <div class="md:hidden">
          <!-- 速報 -->
          <template v-if="activeTab === 'speed'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              メニューから選手を選択してください
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
              メニューから選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.nlPitcherSeason = v.key as 'table' | 'trend'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.nlPitcherSeason === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <div v-if="mView.nlPitcherSeason === 'table'">
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="pitcher" />
                </div>
                <TrendChart v-else :selected-ids="nlPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.nlBatterSeason = v.key as 'table' | 'trend'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.nlBatterSeason === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <div v-if="mView.nlBatterSeason === 'table'">
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="NL" mode="batter" />
                </div>
                <TrendChart v-else :selected-ids="nlBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.alPitcherSeason = v.key as 'table' | 'trend'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.alPitcherSeason === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <div v-if="mView.alPitcherSeason === 'table'">
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="pitcher" />
                </div>
                <TrendChart v-else :selected-ids="alPitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.alBatterSeason = v.key as 'table' | 'trend'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.alBatterSeason === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <div v-if="mView.alBatterSeason === 'table'">
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" league="AL" mode="batter" />
                </div>
                <TrendChart v-else :selected-ids="alBatterIds" :season-data-map="seasonDataMap" mode="batter" />
              </section>
            </template>
          </template>

          <!-- 年度別 -->
          <template v-else-if="activeTab === 'yearly'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              メニューから選手を選択してください
            </div>
            <template v-else>
              <section v-if="nlPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 投手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.nlPitcherYearly = v.key as 'table' | 'chart'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.nlPitcherYearly === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <YearlyChart :selected-ids="nlPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="mView.nlPitcherYearly" />
              </section>
              <section v-if="nlBatterIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ナ・リーグ 野手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.nlBatterYearly = v.key as 'table' | 'chart'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.nlBatterYearly === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <YearlyChart :selected-ids="nlBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="mView.nlBatterYearly" />
              </section>
              <section v-if="alPitcherIds.length" class="mb-8">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 投手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.alPitcherYearly = v.key as 'table' | 'chart'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.alPitcherYearly === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <YearlyChart :selected-ids="alPitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" :view="mView.alPitcherYearly" />
              </section>
              <section v-if="alBatterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-3 pb-2 border-b border-slate-200">ア・リーグ 野手</h2>
                <div class="flex border-b border-slate-200 mb-4">
                  <button v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]" :key="v.key"
                    @click="mView.alBatterYearly = v.key as 'table' | 'chart'"
                    class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                    :class="mView.alBatterYearly === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                  >{{ v.label }}</button>
                </div>
                <YearlyChart :selected-ids="alBatterIds" :yearly-data-map="yearlyDataMap" mode="batter" :view="mView.alBatterYearly" />
              </section>
            </template>
          </template>
        </div>

        <!-- ===== PC: リーグ選択で表示 ===== -->
        <div class="hidden md:block">
          <!-- 速報 -->
          <template v-if="activeTab === 'speed'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="pitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  投手 <span class="text-xs font-normal text-slate-400">（直近3試合）</span>
                </h2>
                <RecentGames :player-ids="pitcherIds" :season-data-map="seasonDataMap" mode="pitcher" :league="activeLeague" :league-stats="leagueStats" />
              </section>
              <section v-if="batterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                  野手 <span class="text-xs font-normal text-slate-400">（直近6試合）</span>
                </h2>
                <RecentGames :player-ids="batterIds" :season-data-map="seasonDataMap" mode="batter" :league="activeLeague" :league-stats="leagueStats" />
              </section>
            </template>
          </template>

          <!-- 今シーズン -->
          <template v-else-if="activeTab === 'season'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="pitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">投手</h2>
                <div class="mb-6">
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" :league="activeLeague" mode="pitcher" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                  <TrendChart :selected-ids="pitcherIds" :season-data-map="seasonDataMap" mode="pitcher" />
                </div>
              </section>
              <section v-if="batterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">野手</h2>
                <div class="mb-6">
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                  <StatsTable :selected-ids="selectedIds" :season-data-map="seasonDataMap" :league-stats="leagueStats" :league="activeLeague" mode="batter" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                  <TrendChart :selected-ids="batterIds" :season-data-map="seasonDataMap" mode="batter" />
                </div>
              </section>
            </template>
          </template>

          <!-- 年度別推移 -->
          <template v-else-if="activeTab === 'yearly'">
            <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
              左のサイドバーで選手を選択してください
            </div>
            <template v-else>
              <section v-if="pitcherIds.length" class="mb-10">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">投手</h2>
                <div class="mb-6">
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                  <YearlyChart :selected-ids="pitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" view="table" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                  <YearlyChart :selected-ids="pitcherIds" :yearly-data-map="yearlyDataMap" mode="pitcher" view="chart" />
                </div>
              </section>
              <section v-if="batterIds.length">
                <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">野手</h2>
                <div class="mb-6">
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                  <YearlyChart :selected-ids="batterIds" :yearly-data-map="yearlyDataMap" mode="batter" view="table" />
                </div>
                <div>
                  <h3 class="text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                  <YearlyChart :selected-ids="batterIds" :yearly-data-map="yearlyDataMap" mode="batter" view="chart" />
                </div>
              </section>
            </template>
          </template>
        </div>

      </div>
    </main>
  </div>
</template>
