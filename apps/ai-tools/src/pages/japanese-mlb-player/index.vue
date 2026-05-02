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
  { key: 'yearly' as const, label: '年度別推移' },
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
  togglePlayer,
  fetchMeta,
  ensureSeasonData,
  ensureYearlyData,
  getSeasonData,
  getYearlyData,
  getLeagueStats,
} = useMlbStats()

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
        <button
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          class="px-5 py-3 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px"
          :class="activeTab === tab.key
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-slate-500 hover:text-slate-700'"
        >{{ tab.label }}</button>

        <div class="hidden md:flex items-center gap-1.5 ml-auto px-4 text-xs text-slate-400">
          <span class="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">NEW</span>
          <span>直近24h更新あり</span>
        </div>
        <div class="ml-auto md:ml-0 flex items-center gap-1 md:hidden">
          <select
            :value="activeLeague"
            @change="activeLeague = ($event.target as HTMLSelectElement).value as 'AL' | 'NL'"
            class="text-xs text-slate-600 border border-slate-200 rounded px-2 py-1.5 bg-white outline-none"
          >
            <option value="AL">ア・リーグ</option>
            <option value="NL">ナ・リーグ</option>
          </select>
          <button
            class="px-4 py-3 text-sm text-slate-500 flex items-center gap-1"
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

      <!-- コンテンツ -->
      <div class="p-5">
        <!-- 今シーズン -->
        <template v-if="activeTab === 'season'">
          <div v-if="selectedIds.length === 0" class="py-16 text-center text-slate-400 text-sm">
            左のサイドバーで選手を選択してください
          </div>
          <template v-else>
            <!-- 投手 -->
            <template v-if="pitcherIds.length">
              <section class="mb-4">
                <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                  成績比較（投手）
                </h2>
                <StatsTable
                  :selected-ids="selectedIds"
                  :season-data-map="seasonDataMap"
                  :league-stats="leagueStats"
                  :league="activeLeague"
                  mode="pitcher"
                />
              </section>
              <section class="mb-10">
                <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                  シーズン内推移（投手）
                </h2>
                <TrendChart
                  :selected-ids="pitcherIds"
                  :season-data-map="seasonDataMap"
                  mode="pitcher"
                />
              </section>
            </template>

            <!-- 野手 -->
            <template v-if="batterIds.length">
              <section class="mb-4">
                <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                  成績比較（野手）
                </h2>
                <StatsTable
                  :selected-ids="selectedIds"
                  :season-data-map="seasonDataMap"
                  :league-stats="leagueStats"
                  :league="activeLeague"
                  mode="batter"
                />
              </section>
              <section>
                <h2 class="text-sm font-bold text-slate-600 mb-3 flex items-center gap-2">
                  <span class="w-1 h-4 rounded inline-block" style="background: #0C447C;" />
                  シーズン内推移（野手）
                </h2>
                <TrendChart
                  :selected-ids="batterIds"
                  :season-data-map="seasonDataMap"
                  mode="batter"
                />
              </section>
            </template>
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
