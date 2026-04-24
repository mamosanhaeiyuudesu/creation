import { getDevYearlyData } from '../../../utils/mlb-dev'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '選手IDが必要です。' })

  const player = PLAYERS.find(p => p.id === id)
  if (!player) throw createError({ statusCode: 404, statusMessage: '選手が見つかりません。' })

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) {
    return getDevYearlyData(id)
  }

  const [batterRows, pitcherRows] = await Promise.all([
    db.prepare(
      "SELECT * FROM mlb_batter_stats WHERE player_id = ? AND date = '' ORDER BY season"
    ).bind(id).all<Record<string, unknown>>(),

    db.prepare(
      "SELECT * FROM mlb_pitcher_stats WHERE player_id = ? AND date = '' ORDER BY season"
    ).bind(id).all<Record<string, unknown>>(),
  ])

  const mapBatter = (r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    season: r.season as number,
    date: null,
    avg: r.avg as number | null,
    obp: r.obp as number | null,
    ops: r.ops as number | null,
    bbPct: r.bb_pct as number | null,
    kPct: r.k_pct as number | null,
  })

  const mapPitcher = (r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    season: r.season as number,
    date: null,
    era: r.era as number | null,
    whip: r.whip as number | null,
    kPct: r.k_pct as number | null,
    bbPct: r.bb_pct as number | null,
  })

  return {
    player,
    yearlyBatter: batterRows.results.map(mapBatter),
    yearlyPitcher: pitcherRows.results.map(mapPitcher),
  }
})
