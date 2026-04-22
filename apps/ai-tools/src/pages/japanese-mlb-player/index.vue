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
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚾</text></svg>` }],
})

const tabs = [
  { key: 'season' as const, label: '今シーズン' },
  { key: 'yearly' as const, label: '年度別推移' },
]

const leagueTabs = [
  { key: 'NL' as const, label: 'ナ・リーグ' },
  { key: 'AL' as const, label: 'ア・リーグ' },
]

const mobileMenu = ref(false)
const activeLeague = ref<'AL' | 'NL'>('NL')

const {
  selectedIds,
  activeTab,
  selectedSeason,
  togglePlayer,
  ensureSeasonData,
  ensureYearlyData,
  getSeasonData,
  getYearlyData,
  getLeagueStats,
} = useMlbStats()

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

const pitcherIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.position === 'pitcher' || p?.position === 'both'
  })
)

const batterIds = computed(() =>
  selectedIds.value.filter(id => {
    const p = PLAYERS.find(pl => pl.id === id)
    return p?.position === 'batter' || p?.position === 'both'
  })
)

const filteredPitcherIds = computed(() =>
  pitcherIds.value.filter(id => PLAYERS.find(pl => pl.id === id)?.league === activeLeague.value)
)

const filteredBatterIds = computed(() =>
  batterIds.value.filter(id => PLAYERS.find(pl => pl.id === id)?.league === activeLeague.value)
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
  await ensureSeasonData()
})

function selectAll() {
  selectedIds.value = PLAYERS.map(p => p.id)
  ensureSeasonData()
}

function deselectAll() {
  selectedIds.value = []
}
</script>

<template>
  <MlbHeader v-model:season="selectedSeason" />

  <div class="flex flex-1 overflow-hidden">
    <PlayerSidebar
      class="hidden md:flex"
      :selected-ids="selectedIds"
      @toggle="togglePlayer"
      @select-all="selectAll"
      @deselect-all="deselectAll"
    />

    <main class="flex-1 overflow-y-auto bg-white">
      <!-- シーズン/年度別タブ -->
      <div class="flex border-b border-slate-200 bg-white sticky top-0 z-10">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px"
          :class="activeTab === tab.key
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
        >{{ tab.label }}</button>

        <button
          class="ml-auto px-4 py-3 text-sm text-slate-500 flex items-center gap-1 md:hidden"
          @click="mobileMenu = !mobileMenu"
        >
          <span>選手 {{ selectedIds.length }}</span>
          <span>{{ mobileMenu ? '▴' : '▾' }}</span>
        </button>
      </div>

      <!-- モバイル選手メニュー -->
      <div v-if="mobileMenu" class="md:hidden border-b border-blue-700">
        <PlayerSidebar
          :selected-ids="selectedIds"
          @toggle="togglePlayer"
          @select-all="selectAll"
          @deselect-all="deselectAll"
          style="width: 100%;"
        />
      </div>

      <!-- コンテンツ -->
      <div class="p-5">
        <!-- 今シーズン -->
        <template v-if="activeTab === 'season'">
          <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
            左のサイドバーで選手を選択してください
          </div>
          <template v-else>
            <!-- AL/NLリーグタブ -->
            <div class="flex gap-1 mb-5">
              <button
                v-for="lt in leagueTabs"
                :key="lt.key"
                @click="activeLeague = lt.key"
                class="px-4 py-1.5 text-xs font-semibold rounded-full border transition-colors"
                :class="activeLeague === lt.key
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'"
              >{{ lt.label }}</button>
            </div>

            <section class="mb-8">
              <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                成績比較
              </h2>
              <StatsTable
                :selected-ids="selectedIds"
                :season-data-map="seasonDataMap"
                :league-stats="leagueStats"
                :league="activeLeague"
              />
            </section>

            <section v-if="filteredPitcherIds.length" class="mb-8">
              <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                シーズン内推移（投手）
              </h2>
              <TrendChart
                :selected-ids="filteredPitcherIds"
                :season-data-map="seasonDataMap"
                mode="pitcher"
              />
            </section>

            <section v-if="filteredBatterIds.length">
              <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                シーズン内推移（野手）
              </h2>
              <TrendChart
                :selected-ids="filteredBatterIds"
                :season-data-map="seasonDataMap"
                mode="batter"
              />
            </section>
          </template>
        </template>

        <!-- 年度別推移 -->
        <template v-else>
          <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
            左のサイドバーで選手を選択してください
          </div>
          <template v-else>
            <section v-if="pitcherIds.length" class="mb-10">
              <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                年度別推移（投手）
              </h2>
              <YearlyChart
                :selected-ids="pitcherIds"
                :yearly-data-map="yearlyDataMap"
                mode="pitcher"
              />
            </section>

            <section v-if="batterIds.length">
              <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                年度別推移（野手）
              </h2>
              <YearlyChart
                :selected-ids="batterIds"
                :yearly-data-map="yearlyDataMap"
                mode="batter"
              />
            </section>
          </template>
        </template>
      </div>
    </main>
  </div>
</template>
