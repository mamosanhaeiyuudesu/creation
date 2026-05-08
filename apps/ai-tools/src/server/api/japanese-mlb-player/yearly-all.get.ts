import type { YearlyData, BatterStats, PitcherStats } from '~/types/mlb'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import { getDevYearlyData } from '~/server/utils/mlb-dev'

const mapBatter = (r: Record<string, unknown>): BatterStats => ({
  playerId: r.player_id as string,
  season: r.season as number,
  date: null,
  avg: r.avg as number | null,
  obp: r.obp as number | null,
  slg: r.slg as number | null,
  ops: r.ops as number | null,
  bbPct: r.bb_pct as number | null,
  kPct: r.k_pct as number | null,
  hr: r.hr as number | null,
  rbi: r.rbi as number | null,
  hits: r.hits as number | null,
  runs: r.runs as number | null,
  stolenBases: r.stolen_bases as number | null,
  bbk: r.bbk as number | null,
  strikeouts: r.strikeouts as number | null,
  walks: r.walks as number | null,
  totalBases: r.total_bases as number | null,
  atBats: r.at_bats as number | null,
})

const mapPitcher = (r: Record<string, unknown>): PitcherStats => ({
  playerId: r.player_id as string,
  season: r.season as number,
  date: null,
  era: r.era as number | null,
  whip: r.whip as number | null,
  kPct: r.k_pct as number | null,
  bbPct: r.bb_pct as number | null,
  wins: r.wins as number | null,
  losses: r.losses as number | null,
  strikeouts: r.strikeouts as number | null,
  inningsPitched: r.innings_pitched as number | null,
  saves: r.saves as number | null,
  holds: r.holds as number | null,
  fip: r.fip as number | null,
  bbk: r.bbk as number | null,
  runsAllowed: r.runs_allowed as number | null,
})

export default defineEventHandler(async (event): Promise<Record<string, YearlyData>> => {
  const query = getQuery(event)
  const idsParam = query.ids as string | undefined
  const ids = (idsParam ? idsParam.split(',').filter(Boolean) : PLAYERS.map(p => p.id))
    .filter(id => PLAYERS.some(p => p.id === id))

  if (ids.length === 0) return {}

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) {
    const result: Record<string, YearlyData> = {}
    for (const id of ids) {
      const data = getDevYearlyData(id)
      if (data) result[id] = data
    }
    return result
  }

  const ph = ids.map(() => '?').join(', ')
  const [batterRows, pitcherRows] = await Promise.all([
    db.prepare(`SELECT * FROM mlb_batter_stats WHERE player_id IN (${ph}) AND date = '' ORDER BY season`)
      .bind(...ids).all<Record<string, unknown>>(),
    db.prepare(`SELECT * FROM mlb_pitcher_stats WHERE player_id IN (${ph}) AND date = '' ORDER BY season`)
      .bind(...ids).all<Record<string, unknown>>(),
  ])

  const result: Record<string, YearlyData> = {}
  for (const id of ids) {
    const player = PLAYERS.find(p => p.id === id)
    if (!player) continue
    result[id] = {
      player,
      yearlyBatter: batterRows.results.filter((r: Record<string, unknown>) => r.player_id === id).map(mapBatter),
      yearlyPitcher: pitcherRows.results.filter((r: Record<string, unknown>) => r.player_id === id).map(mapPitcher),
    }
  }
  return result
})
