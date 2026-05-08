import { getDevSeasonData } from '../../../utils/mlb-dev'
import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import { currentYearJST } from '~/utils/jst'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: '選手IDが必要です。' })

  const player = PLAYERS.find(p => p.id === id)
  if (!player) throw createError({ statusCode: 404, statusMessage: '選手が見つかりません。' })

  const query = getQuery(event)
  const season = Number(query.season ?? currentYearJST())

  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) {
    return getDevSeasonData(id)
  }

  const [batterCurrent, pitcherCurrent, batterTrend, pitcherTrend] = await Promise.all([
    db.prepare(
      "SELECT * FROM mlb_batter_stats WHERE player_id = ? AND season = ? AND date = ''"
    ).bind(id, season).first<Record<string, unknown>>(),

    db.prepare(
      "SELECT * FROM mlb_pitcher_stats WHERE player_id = ? AND season = ? AND date = ''"
    ).bind(id, season).first<Record<string, unknown>>(),

    db.prepare(
      "SELECT * FROM mlb_batter_stats WHERE player_id = ? AND season = ? AND date != '' ORDER BY date"
    ).bind(id, season).all<Record<string, unknown>>(),

    db.prepare(
      "SELECT * FROM mlb_pitcher_stats WHERE player_id = ? AND season = ? AND date != '' ORDER BY date"
    ).bind(id, season).all<Record<string, unknown>>(),
  ])

  const mapBatter = (r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    season: r.season as number,
    date: r.date as string | null,
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

  const mapPitcher = (r: Record<string, unknown>) => ({
    playerId: r.player_id as string,
    season: r.season as number,
    date: r.date as string | null,
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

  return {
    player,
    currentBatter: batterCurrent ? mapBatter(batterCurrent) : null,
    currentPitcher: pitcherCurrent ? mapPitcher(pitcherCurrent) : null,
    trendBatter: batterTrend.results.map(mapBatter),
    trendPitcher: pitcherTrend.results.map(mapPitcher),
  }
})
