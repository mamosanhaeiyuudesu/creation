<script setup lang="ts">
import type { SeasonData, YearlyData } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import MlbHeader from '~/components/japanese-mlb-player/MlbHeader.vue'
import PlayerSidebar from '~/components/japanese-mlb-player/PlayerSidebar.vue'
import StatsTable from '~/components/japanese-mlb-player/StatsTable.vue'
import TrendChart from '~/components/japanese-mlb-player/TrendChart.vue'
import YearlyChart from '~/components/japanese-mlb-player/YearlyChart.vue'

definePageMeta({ ssr: false, layout: 'japanese-mlb-player' })

useHead({
  title: 'MLB日本人選手成績',
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

const pitcherView = ref<'table' | 'trend'>('table')
const batterView = ref<'table' | 'trend'>('table')
const pitcherYearlyView = ref<'table' | 'chart'>('table')
const batterYearlyView = ref<'table' | 'chart'>('table')

watch([activeLeague, activeTab], ([league, tab]) => {
  const query: Record<string, string> = {}
  if (league !== 'NL') query.league = league
  if (tab !== 'season') query.tab = tab
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

watch(activeTab, async (tab) => {
  if (tab === 'season') await ensureSeasonData()
  else await ensureYearlyData()
})

watch(selectedIds, async () => {
  if (activeTab.value === 'season') await ensureSeasonData()
  else await ensureYearlyData()
}, { deep: true })

onMounted(async () => {
  fetchMeta()
  if (route.query.tab === 'yearly') {
    activeTab.value = 'yearly'
    await ensureYearlyData()
  } else {
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

        <div class="ml-auto hidden md:flex items-center pr-4 text-[11px] text-slate-400">
          <img src="/new_10785603.png" class="w-5 h-5 mr-1" alt="NEW" />
          当日または前日に更新あり
        </div>

        <!-- モバイル: select -->
        <div class="flex flex-1 items-center justify-between px-2 md:hidden">
          <select
            :value="activeTab"
            @change="activeTab = ($event.target as HTMLSelectElement).value as 'season' | 'yearly'"
            class="text-xs text-slate-600 border border-slate-200 rounded px-2 py-1.5 bg-white outline-none"
          >
            <option v-for="tab in tabs" :key="tab.key" :value="tab.key">{{ tab.label }}</option>
          </select>
          <select
            :value="activeLeague"
            @change="activeLeague = ($event.target as HTMLSelectElement).value as 'AL' | 'NL'"
            class="text-xs text-slate-600 border border-slate-200 rounded px-2 py-1.5 bg-white outline-none"
          >
            <option value="NL">ナ・リーグ</option>
            <option value="AL">ア・リーグ</option>
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
          :show-league="false"
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
        <!-- 今シーズン -->
        <template v-if="activeTab === 'season'">
          <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
            左のサイドバーで選手を選択してください
          </div>
          <template v-else>
            <!-- ===== 投手 ===== -->
            <section v-if="pitcherIds.length" class="mb-10">
              <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                投手
              </h2>

              <!-- モバイル: サブタブ -->
              <div class="md:hidden flex border-b border-slate-200 mb-4">
                <button
                  v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]"
                  :key="v.key"
                  @click="pitcherView = v.key as 'table' | 'trend'"
                  class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                  :class="pitcherView === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                >{{ v.label }}</button>
              </div>

              <!-- 成績比較 -->
              <div class="mb-6" :class="{ 'hidden md:block': pitcherView !== 'table' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                <StatsTable
                  :selected-ids="selectedIds"
                  :season-data-map="seasonDataMap"
                  :league-stats="leagueStats"
                  :league="activeLeague"
                  mode="pitcher"
                />
              </div>

              <!-- 推移グラフ -->
              <div :class="{ 'hidden md:block': pitcherView !== 'trend' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                <TrendChart
                  :selected-ids="pitcherIds"
                  :season-data-map="seasonDataMap"
                  mode="pitcher"
                />
              </div>
            </section>

            <!-- ===== 野手 ===== -->
            <section v-if="batterIds.length">
              <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                野手
              </h2>

              <!-- モバイル: サブタブ -->
              <div class="md:hidden flex border-b border-slate-200 mb-4">
                <button
                  v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'trend', label: '推移グラフ' }]"
                  :key="v.key"
                  @click="batterView = v.key as 'table' | 'trend'"
                  class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                  :class="batterView === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                >{{ v.label }}</button>
              </div>

              <!-- 成績比較 -->
              <div class="mb-6" :class="{ 'hidden md:block': batterView !== 'table' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                <StatsTable
                  :selected-ids="selectedIds"
                  :season-data-map="seasonDataMap"
                  :league-stats="leagueStats"
                  :league="activeLeague"
                  mode="batter"
                />
              </div>

              <!-- 推移グラフ -->
              <div :class="{ 'hidden md:block': batterView !== 'trend' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                <TrendChart
                  :selected-ids="batterIds"
                  :season-data-map="seasonDataMap"
                  mode="batter"
                />
              </div>
            </section>
          </template>
        </template>

        <!-- 年度別推移 -->
        <template v-else>
          <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
            左のサイドバーで選手を選択してください
          </div>
          <template v-else>
            <!-- ===== 投手 ===== -->
            <section v-if="pitcherIds.length" class="mb-10">
              <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                投手
              </h2>

              <!-- モバイル: サブタブ -->
              <div class="md:hidden flex border-b border-slate-200 mb-4">
                <button
                  v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]"
                  :key="v.key"
                  @click="pitcherYearlyView = v.key as 'table' | 'chart'"
                  class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                  :class="pitcherYearlyView === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                >{{ v.label }}</button>
              </div>

              <!-- 成績比較 -->
              <div class="mb-6" :class="{ 'hidden md:block': pitcherYearlyView !== 'table' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                <YearlyChart
                  :selected-ids="pitcherIds"
                  :yearly-data-map="yearlyDataMap"
                  mode="pitcher"
                  view="table"
                />
              </div>

              <!-- 推移グラフ -->
              <div :class="{ 'hidden md:block': pitcherYearlyView !== 'chart' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                <YearlyChart
                  :selected-ids="pitcherIds"
                  :yearly-data-map="yearlyDataMap"
                  mode="pitcher"
                  view="chart"
                />
              </div>
            </section>

            <!-- ===== 野手 ===== -->
            <section v-if="batterIds.length">
              <h2 class="text-base font-bold text-slate-800 mb-4 pb-2 border-b border-slate-200">
                野手
              </h2>

              <!-- モバイル: サブタブ -->
              <div class="md:hidden flex border-b border-slate-200 mb-4">
                <button
                  v-for="v in [{ key: 'table', label: '成績比較' }, { key: 'chart', label: '推移グラフ' }]"
                  :key="v.key"
                  @click="batterYearlyView = v.key as 'table' | 'chart'"
                  class="flex-1 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors duration-150"
                  :class="batterYearlyView === v.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'"
                >{{ v.label }}</button>
              </div>

              <!-- 成績比較 -->
              <div class="mb-6" :class="{ 'hidden md:block': batterYearlyView !== 'table' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">成績比較</h3>
                <YearlyChart
                  :selected-ids="batterIds"
                  :yearly-data-map="yearlyDataMap"
                  mode="batter"
                  view="table"
                />
              </div>

              <!-- 推移グラフ -->
              <div :class="{ 'hidden md:block': batterYearlyView !== 'chart' }">
                <h3 class="hidden md:block text-sm font-semibold text-slate-500 mb-3">推移グラフ</h3>
                <YearlyChart
                  :selected-ids="batterIds"
                  :yearly-data-map="yearlyDataMap"
                  mode="batter"
                  view="chart"
                />
              </div>
            </section>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>
