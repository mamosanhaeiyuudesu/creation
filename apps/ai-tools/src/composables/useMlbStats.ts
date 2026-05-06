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
    const cleared = new Set(failedIds.value)
    cleared.delete(playerId)
    failedIds.value = cleared
    try {
      let lastError: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const data = await $fetch<SeasonData>(
            `/api/japanese-mlb-player/season/${playerId}`,
            { query: { season: currentSeason } }
          )
          const next = new Map(seasonCache.value)
          next.set(playerId, data)
          seasonCache.value = next
          return
        } catch (e) {
          lastError = e
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      throw lastError
    } catch {
      failedIds.value = new Set([...failedIds.value, playerId])
    } finally {
      const next = new Set(loadingIds.value)
      next.delete(playerId)
      loadingIds.value = next
    }
  }

  async function fetchYearly(playerId: string) {
    if (yearlyCache.value.has(playerId) || loadingIds.value.has(playerId)) return
    loadingIds.value = new Set([...loadingIds.value, playerId])
    const cleared = new Set(failedIds.value)
    cleared.delete(playerId)
    failedIds.value = cleared
    try {
      let lastError: unknown
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const data = await $fetch<YearlyData>(`/api/japanese-mlb-player/yearly/${playerId}`)
          const next = new Map(yearlyCache.value)
          next.set(playerId, data)
          yearlyCache.value = next
          return
        } catch (e) {
          lastError = e
          if (attempt < 2) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
        }
      }
      throw lastError
    } catch {
      failedIds.value = new Set([...failedIds.value, playerId])
    } finally {
      const next = new Set(loadingIds.value)
      next.delete(playerId)
      loadingIds.value = next
    }
  }

  async function runLimited<T>(tasks: (() => Promise<T>)[], limit: number): Promise<void> {
    let i = 0
    async function worker() {
      while (i < tasks.length) { await tasks[i++]() }
    }
    await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker))
  }

  async function ensureSeasonData() {
    await Promise.all([
      runLimited(selectedIds.value.map(id => () => fetchSeason(id)), 4),
      ensureLeagueStats(),
    ])
  }

  async function ensureYearlyData() {
    await runLimited(selectedIds.value.map(id => () => fetchYearly(id)), 4)
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

  const hasFailed = computed(() => failedIds.value.size > 0)

  async function retryFailed() {
    const ids = [...failedIds.value]
    failedIds.value = new Set()
    leagueFailed.value = false
    if (activeTab.value === 'season') {
      await Promise.all([
        runLimited(ids.map(id => () => fetchSeason(id)), 4),
        ensureLeagueStats(),
      ])
    } else {
      await runLimited(ids.map(id => () => fetchYearly(id)), 4)
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
    fetchSeason,
    fetchYearly,
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
