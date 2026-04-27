import type { SeasonData, YearlyData, AllLeagueStats } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'

export function useMlbStats() {
  const DEFAULT_EXCLUDED = new Set(['673513', '506433']) // 松井・ダルビッシュ
  const selectedIds = useState<string[]>('mlb-selected', () => PLAYERS.map(p => p.id).filter(id => !DEFAULT_EXCLUDED.has(id)))
  const activeTab = useState<'season' | 'yearly'>('mlb-tab', () => 'season')
  const currentSeason = new Date().getFullYear()

  const seasonCache = useState<Map<string, SeasonData>>('mlb-season-cache', () => new Map())
  const yearlyCache = useState<Map<string, YearlyData>>('mlb-yearly-cache', () => new Map())
  const leagueStatsCache = useState<AllLeagueStats | null>('mlb-league-stats', () => null)
  const loadingIds = useState<Set<string>>('mlb-loading', () => new Set())
  const leagueLoading = useState<boolean>('mlb-league-loading', () => false)

  const selectedPlayers = computed(() =>
    selectedIds.value.map(id => PLAYERS.find(p => p.id === id)).filter(Boolean) as typeof PLAYERS
  )

  function togglePlayer(id: string) {
    const idx = selectedIds.value.indexOf(id)
    if (idx >= 0) {
      selectedIds.value = selectedIds.value.filter(i => i !== id)
    } else {
      selectedIds.value = [...selectedIds.value, id]
    }
  }

  async function fetchSeason(playerId: string) {
    if (seasonCache.value.has(playerId) || loadingIds.value.has(playerId)) return
    loadingIds.value = new Set([...loadingIds.value, playerId])
    try {
      const data = await $fetch<SeasonData>(
        `/api/japanese-mlb-player/season/${playerId}`,
        { query: { season: currentSeason } }
      )
      const next = new Map(seasonCache.value)
      next.set(playerId, data)
      seasonCache.value = next
    } finally {
      const next = new Set(loadingIds.value)
      next.delete(playerId)
      loadingIds.value = next
    }
  }

  async function fetchYearly(playerId: string) {
    if (yearlyCache.value.has(playerId) || loadingIds.value.has(playerId)) return
    loadingIds.value = new Set([...loadingIds.value, playerId])
    try {
      const data = await $fetch<YearlyData>(`/api/japanese-mlb-player/yearly/${playerId}`)
      const next = new Map(yearlyCache.value)
      next.set(playerId, data)
      yearlyCache.value = next
    } finally {
      const next = new Set(loadingIds.value)
      next.delete(playerId)
      loadingIds.value = next
    }
  }

  async function ensureSeasonData() {
    await Promise.all([
      ...selectedIds.value.map(id => fetchSeason(id)),
      ensureLeagueStats(),
    ])
  }

  async function ensureYearlyData() {
    await Promise.all(selectedIds.value.map(id => fetchYearly(id)))
  }

  async function ensureLeagueStats() {
    if (leagueStatsCache.value || leagueLoading.value) return
    leagueLoading.value = true
    try {
      const data = await $fetch<AllLeagueStats>('/api/japanese-mlb-player/league-stats', {
        query: { season: currentSeason },
      })
      leagueStatsCache.value = data
    } finally {
      leagueLoading.value = false
    }
  }

  function getLeagueStats(): AllLeagueStats | null {
    return leagueStatsCache.value
  }

  function isLoading(id: string) {
    return loadingIds.value.has(id)
  }

  function getSeasonData(id: string) {
    return seasonCache.value.get(id) ?? null
  }

  function getYearlyData(id: string) {
    return yearlyCache.value.get(id) ?? null
  }

  return {
    selectedIds,
    selectedPlayers,
    activeTab,
    togglePlayer,
    fetchSeason,
    fetchYearly,
    ensureSeasonData,
    ensureYearlyData,
    isLoading,
    getSeasonData,
    getYearlyData,
    getLeagueStats,
  }
}
