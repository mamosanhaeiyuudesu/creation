/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み
 */

import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import { currentYearJST, nowJST } from '~/utils/jst'
import {
  MLB_DEBUT_SEASONS,
  fetchBatterSeason,
  fetchPitcherSeason,
  fetchBatterYearly,
  fetchPitcherYearly,
  fetchBatterGameLog,
  fetchPitcherGameLog,
  sleep,
} from '../utils/mlbstats'

export default defineTask({
  meta: {
    name: 'mlb:sync',
    description: 'MLB Stats APIから日本人選手成績を取得してD1に保存',
  },
  async run({ context }) {
    const db = (context as Record<string, unknown>)?.cloudflare?.env?.MLB_DB as D1Database | undefined
    if (!db) throw new Error('MLB_DB バインディングが見つかりません')

    const season = currentYearJST()

    await db.batch(PLAYERS.map(p =>
      db.prepare(
        'INSERT OR REPLACE INTO mlb_players (id, name_ja, name_en, position, team, team_full, league) VALUES (?,?,?,?,?,?,?)'
      ).bind(p.id, p.nameJa, p.nameEn, p.position, p.team, p.teamFull, p.league)
    ))

    for (const player of PLAYERS) {
      const debutSeason = MLB_DEBUT_SEASONS[player.id] ?? season
      const stmts: ReturnType<D1Database['prepare']>[] = []

      if (player.position === 'batter' || player.position === 'both') {
        const seasonRow = await fetchBatterSeason(player.id, season)
        if (seasonRow) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, slg, ops, bb_pct, k_pct, hr, rbi, hits, runs, stolen_bases) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(seasonRow.playerId, seasonRow.season, seasonRow.date, seasonRow.avg, seasonRow.obp, seasonRow.slg, seasonRow.ops, seasonRow.bbPct, seasonRow.kPct, seasonRow.hr, seasonRow.rbi, seasonRow.hits, seasonRow.runs, seasonRow.stolenBases))
        }

        for (const row of await fetchBatterGameLog(player.id, season)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, slg, ops, bb_pct, k_pct, hr, rbi, hits, runs, stolen_bases) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.avg, row.obp, row.slg, row.ops, row.bbPct, row.kPct, row.hr, row.rbi, row.hits, row.runs, row.stolenBases))
        }

        for (const row of await fetchBatterYearly(player.id, debutSeason, season - 1)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, slg, ops, bb_pct, k_pct, hr, rbi, hits, runs, stolen_bases) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.avg, row.obp, row.slg, row.ops, row.bbPct, row.kPct, row.hr, row.rbi, row.hits, row.runs, row.stolenBases))
        }

        await sleep(300)
      }

      if (player.position === 'pitcher' || player.position === 'both') {
        const seasonRow = await fetchPitcherSeason(player.id, season)
        if (seasonRow) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct, wins, losses, strikeouts, innings_pitched, saves, holds) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(seasonRow.playerId, seasonRow.season, seasonRow.date, seasonRow.era, seasonRow.whip, seasonRow.kPct, seasonRow.bbPct, seasonRow.wins, seasonRow.losses, seasonRow.strikeouts, seasonRow.inningsPitched, seasonRow.saves, seasonRow.holds))
        }

        for (const row of await fetchPitcherGameLog(player.id, season)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct, wins, losses, strikeouts, innings_pitched, saves, holds) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.era, row.whip, row.kPct, row.bbPct, row.wins, row.losses, row.strikeouts, row.inningsPitched, row.saves, row.holds))
        }

        for (const row of await fetchPitcherYearly(player.id, debutSeason, season - 1)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct, wins, losses, strikeouts, innings_pitched, saves, holds) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.era, row.whip, row.kPct, row.bbPct, row.wins, row.losses, row.strikeouts, row.inningsPitched, row.saves, row.holds))
        }

        await sleep(300)
      }

      if (stmts.length > 0) await db.batch(stmts)
    }

    const lastSyncedAt = nowJST().toISOString().slice(0, 19).replace('T', ' ')
    await db.prepare('INSERT OR REPLACE INTO mlb_meta (key, value) VALUES (?, ?)').bind('last_synced_at', lastSyncedAt).run()

    return { result: `synced ${PLAYERS.length} players`, season, lastSyncedAt }
  },
})
