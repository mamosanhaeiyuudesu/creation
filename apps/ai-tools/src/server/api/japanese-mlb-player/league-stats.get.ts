import type { AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import { fetchLeagueBatters, fetchLeaguePitchers } from '~/server/utils/mlbstats'
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

// AL = 103, NL = 104
async function getLeagueBlock(leagueId: number, season: number): Promise<LeagueStatsBlock> {
  const [batters, pitchers] = await Promise.all([
    fetchLeagueBatters(leagueId, season),
    fetchLeaguePitchers(leagueId, season),
  ])

  return {
    batter: {
      avg: computeSummary(batters.map(s => s.avg), true) ?? undefined,
      obp: computeSummary(batters.map(s => s.obp), true) ?? undefined,
      ops: computeSummary(batters.map(s => s.ops), true) ?? undefined,
      bbPct: computeSummary(batters.map(s => s.bbPct), true) ?? undefined,
      kPct: computeSummary(batters.map(s => s.kPct), false) ?? undefined,
    },
    pitcher: {
      era: computeSummary(pitchers.map(s => s.era), false) ?? undefined,
      whip: computeSummary(pitchers.map(s => s.whip), false) ?? undefined,
      kPct: computeSummary(pitchers.map(s => s.kPct), true) ?? undefined,
      bbPct: computeSummary(pitchers.map(s => s.bbPct), false) ?? undefined,
    },
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season ?? new Date().getFullYear())

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  if (!env?.MLB_DB) {
    return getDevLeagueStats()
  }

  const [al, nl] = await Promise.all([
    getLeagueBlock(103, season),
    getLeagueBlock(104, season),
  ])

  return { AL: al, NL: nl } satisfies AllLeagueStats
})
