import type { AllLeagueStats, LeagueStatsBlock, LeagueStatSummary } from '~/types/mlb'
import { currentYearJST } from '~/utils/jst'
import { fetchLeagueBatters, fetchLeaguePitchers, fetchLeagueBatterCounts, fetchLeaguePitcherCounts } from '~/server/utils/mlbstats'
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
  const [batters, pitchers, batterCounts, pitcherCounts] = await Promise.all([
    fetchLeagueBatters(leagueId, season),
    fetchLeaguePitchers(leagueId, season),
    fetchLeagueBatterCounts(leagueId, season),
    fetchLeaguePitcherCounts(leagueId, season),
  ])

  return {
    batter: {
      avg:         computeSummary(batters.map(s => s.avg), true) ?? undefined,
      obp:         computeSummary(batters.map(s => s.obp), true) ?? undefined,
      slg:         computeSummary(batters.map(s => s.slg), true) ?? undefined,
      ops:         computeSummary(batters.map(s => s.ops), true) ?? undefined,
      bbPct:       computeSummary(batters.map(s => s.bbPct), true) ?? undefined,
      kPct:        computeSummary(batters.map(s => s.kPct), false) ?? undefined,
      hr:          computeSummary(batterCounts.map(s => s.hr), true) ?? undefined,
      rbi:         computeSummary(batterCounts.map(s => s.rbi), true) ?? undefined,
      hits:        computeSummary(batterCounts.map(s => s.hits), true) ?? undefined,
      runs:        computeSummary(batterCounts.map(s => s.runs), true) ?? undefined,
      stolenBases: computeSummary(batterCounts.map(s => s.stolenBases), true) ?? undefined,
      bbk:         computeSummary(batters.map(s => s.bbk), true) ?? undefined,
    },
    pitcher: {
      era:            computeSummary(pitchers.map(s => s.era), false) ?? undefined,
      whip:           computeSummary(pitchers.map(s => s.whip), false) ?? undefined,
      kPct:           computeSummary(pitchers.map(s => s.kPct), true) ?? undefined,
      bbPct:          computeSummary(pitchers.map(s => s.bbPct), false) ?? undefined,
      wins:           computeSummary(pitcherCounts.map(s => s.wins), true) ?? undefined,
      losses:         computeSummary(pitcherCounts.map(s => s.losses), true) ?? undefined,
      strikeouts:     computeSummary(pitcherCounts.map(s => s.strikeouts), true) ?? undefined,
      inningsPitched: computeSummary(pitcherCounts.map(s => s.inningsPitched), true) ?? undefined,
      saves:          computeSummary(pitcherCounts.map(s => s.saves), true) ?? undefined,
      holds:          computeSummary(pitcherCounts.map(s => s.holds), true) ?? undefined,
      fip:            computeSummary(pitchers.map(s => s.fip), false) ?? undefined,
      bbk:            computeSummary(pitchers.map(s => s.bbk), false) ?? undefined,
    },
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const season = Number(query.season ?? currentYearJST())

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  if (!env?.MLB_DB) {
    return getDevLeagueStats()
  }

  const [nl, al] = await Promise.all([
    getLeagueBlock(104, season),
    getLeagueBlock(103, season),
  ])

  return { AL: al, NL: nl } satisfies AllLeagueStats
})
