import type { AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import {
  fetchFgLeagueBatters, fetchFgLeaguePitchers,
  mapBatterRow, mapPitcherRow,
} from '~/server/utils/fangraphs'
import { getDevLeagueStats } from '~/server/utils/mlb-dev'

function computeSummary(values: (number | null)[], higherIsBetter: boolean): LeagueStatSummary | null {
  const valid = values.filter((v): v is number => v !== null && isFinite(v))
  if (valid.length === 0) return null
  const sorted = [...valid].sort((a, b) => higherIsBetter ? b - a : a - b)
  const avg = valid.reduce((a, b) => a + b, 0) / valid.length
  return {
    leaderValue: sorted[0],
    leagueAvg: Math.round(avg * 1000) / 1000,
    sortedValues: sorted,
  }
}

async function getLeagueBlock(league: 'al' | 'nl', season: number): Promise<LeagueStatsBlock> {
  const [bRows, pRows] = await Promise.all([
    fetchFgLeagueBatters(league, season),
    fetchFgLeaguePitchers(league, season),
  ])

  const bStats = bRows.map(r => mapBatterRow(r, '', season, ''))
  const pStats = pRows.map(r => mapPitcherRow(r, '', season, ''))

  return {
    batter: {
      avg: computeSummary(bStats.map(s => s.avg), true) ?? undefined,
      obp: computeSummary(bStats.map(s => s.obp), true) ?? undefined,
      ops: computeSummary(bStats.map(s => s.ops), true) ?? undefined,
      wrcPlus: computeSummary(bStats.map(s => s.wrcPlus), true) ?? undefined,
      bbPct: computeSummary(bStats.map(s => s.bbPct), true) ?? undefined,
      kPct: computeSummary(bStats.map(s => s.kPct), false) ?? undefined,
      war: computeSummary(bStats.map(s => s.war), true) ?? undefined,
    },
    pitcher: {
      era: computeSummary(pStats.map(s => s.era), false) ?? undefined,
      fip: computeSummary(pStats.map(s => s.fip), false) ?? undefined,
      whip: computeSummary(pStats.map(s => s.whip), false) ?? undefined,
      kPct: computeSummary(pStats.map(s => s.kPct), true) ?? undefined,
      bbPct: computeSummary(pStats.map(s => s.bbPct), false) ?? undefined,
      gbPct: computeSummary(pStats.map(s => s.gbPct), true) ?? undefined,
      war: computeSummary(pStats.map(s => s.war), true) ?? undefined,
    },
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season ?? 2026)

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  if (!env?.MLB_DB) {
    return getDevLeagueStats()
  }

  const [al, nl] = await Promise.all([
    getLeagueBlock('al', season),
    getLeagueBlock('nl', season),
  ])

  return { AL: al, NL: nl } satisfies AllLeagueStats
})
