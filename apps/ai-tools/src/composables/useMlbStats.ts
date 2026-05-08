import type { SeasonData, YearlyData, AllLeagueStats } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'

export function useMlbStats() {
  const DEFAULT_EXCLUDED = new Set(['673513', '506433', '663457']) // 松井・ダルビッシュ・ヌートバー
  const selectedIds = useState<string[]>('mlb-selected', () => PLAYERS.map(p => p.id).filter(id => !DEFAULT_EXCLUDED.has(id)))
  const activeTab = useState<'season' | 'yearly'>('mlb-tab', () => 'season')
  const currentSeason = currentYearJST()

  const seasonCache = useState<Map<string, SeasonData>>('mlb-season-cache', () => new Map())
  const yearlyCache = useState<Map<string, YearlyData>>('mlb-yearly-cache', () => new Map())
  const leagueStatsCache = useState<AllLeagueStats | null>('mlb-league-stats', () => null)
  const lastSyncedAt = useState<string | null>('mlb-last-synced', () => null)
  const loadingIds = useState<Set<string>>('mlb-loading', () => new Set())
  const leagueLoading = useState<boolean>('mlb-league-loading', () => false)
  const leagueFailed = useState<boolean>('mlb-league-failed', () => false)
  const failedIds = useState<Set<string>>('mlb-failed', () => new Set())
  const seasonBatchLoading = useState<boolean>('mlb-season-batch-loading', () => false)
  const yearlyBatchLoading = useState<boolean>('mlb-yearly-batch-loading', () => false)

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

  async function fetchSeasonBatch(ids: string[]) {
    if (ids.length === 0) return
    loadingIds.value = new Set([...loadingIds.value, ...ids])
    const cleared = new Set(failedIds.value)
    ids.forEach(id => cleared.delete(id))
    failedIds.value = cleared
    try {
      const data = await $fetch<Record<string, SeasonData>>('/api/japanese-mlb-player/season-all', {
        query: { season: currentSeason, ids: ids.join(',') },
      })
      const next = new Map(seasonCache.value)
      for (const [id, playerData] of Object.entries(data)) {
        next.set(id, playerData)
      }
      seasonCache.value = next
    } catch {
      failedIds.value = new Set([...failedIds.value, ...ids])
    } finally {
      const next = new Set(loadingIds.value)
      ids.forEach(id => next.delete(id))
      loadingIds.value = next
    }
  }

  async function fetchYearlyBatch(ids: string[]) {
    if (ids.length === 0) return
    loadingIds.value = new Set([...loadingIds.value, ...ids])
    const cleared = new Set(failedIds.value)
    ids.forEach(id => cleared.delete(id))
    failedIds.value = cleared
    try {
      const data = await $fetch<Record<string, YearlyData>>('/api/japanese-mlb-player/yearly-all', {
        query: { ids: ids.join(',') },
      })
      const next = new Map(yearlyCache.value)
      for (const [id, playerData] of Object.entries(data)) {
        next.set(id, playerData)
      }
      yearlyCache.value = next
    } catch {
      failedIds.value = new Set([...failedIds.value, ...ids])
    } finally {
      const next = new Set(loadingIds.value)
      ids.forEach(id => next.delete(id))
      loadingIds.value = next
    }
  }

  async function ensureSeasonData() {
    if (seasonBatchLoading.value) return
    const toFetch = selectedIds.value.filter(id => !seasonCache.value.has(id) && !loadingIds.value.has(id))
    if (toFetch.length === 0) {
      await ensureLeagueStats()
      return
    }
    seasonBatchLoading.value = true
    try {
      await Promise.all([fetchSeasonBatch(toFetch), ensureLeagueStats()])
    } finally {
      seasonBatchLoading.value = false
    }
  }

  async function ensureYearlyData() {
    if (yearlyBatchLoading.value) return
    const toFetch = selectedIds.value.filter(id => !yearlyCache.value.has(id) && !loadingIds.value.has(id))
    if (toFetch.length === 0) return
    yearlyBatchLoading.value = true
    try {
      await fetchYearlyBatch(toFetch)
    } finally {
      yearlyBatchLoading.value = false
    }
  }

  async function fetchMeta() {
    try {
      const data = await $fetch<{ lastSyncedAt: string | null }>('/api/japanese-mlb-player/meta')
      lastSyncedAt.value = data.lastSyncedAt
    } catch { }
  }

  async function ensureLeagueStats() {
    if (leagueStatsCache.value || leagueLoading.value || leagueFailed.value) return
    leagueLoading.value = true
    try {
      const data = await $fetch<AllLeagueStats>('/api/japanese-mlb-player/league-stats', {
        query: { season: currentSeason },
      })
      leagueStatsCache.value = data
    } catch {
      leagueFailed.value = true
    } finally {
      leagueLoading.value = false
    }
  }

  const hasFailed = computed(() => failedIds.value.size > 0 || leagueFailed.value)

  async function retryFailed() {
    const ids = [...failedIds.value]
    failedIds.value = new Set()
    leagueFailed.value = false
    if (activeTab.value === 'season') {
      await Promise.all([fetchSeasonBatch(ids), ensureLeagueStats()])
    } else {
      await fetchYearlyBatch(ids)
    }
  }

  function getLeagueStats(): AllLeagueStats | null {
    return leagueStatsCache.value
  }

  function isLoading(id: string) {
    return loadingIds.value.has(id)
  }

  function isError(id: string) {
    return failedIds.value.has(id)
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
    lastSyncedAt,
    hasFailed,
    togglePlayer,
    fetchMeta,
    ensureSeasonData,
    ensureYearlyData,
    retryFailed,
    isLoading,
    isError,
    getSeasonData,
    getYearlyData,
    getLeagueStats,
  }
}
