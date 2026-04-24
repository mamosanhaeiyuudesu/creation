/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み
 */

import { PLAYERS } from '~/utils/japanese-mlb-player/players'
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

    const season = new Date().getFullYear()

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
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, ops, bb_pct, k_pct) VALUES (?,?,?,?,?,?,?,?)'
          ).bind(seasonRow.playerId, seasonRow.season, seasonRow.date, seasonRow.avg, seasonRow.obp, seasonRow.ops, seasonRow.bbPct, seasonRow.kPct))
        }

        for (const row of await fetchBatterGameLog(player.id, season)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, ops, bb_pct, k_pct) VALUES (?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.avg, row.obp, row.ops, row.bbPct, row.kPct))
        }

        for (const row of await fetchBatterYearly(player.id, debutSeason, season - 1)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, ops, bb_pct, k_pct) VALUES (?,?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.avg, row.obp, row.ops, row.bbPct, row.kPct))
        }

        await sleep(300)
      }

      if (player.position === 'pitcher' || player.position === 'both') {
        const seasonRow = await fetchPitcherSeason(player.id, season)
        if (seasonRow) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct) VALUES (?,?,?,?,?,?,?)'
          ).bind(seasonRow.playerId, seasonRow.season, seasonRow.date, seasonRow.era, seasonRow.whip, seasonRow.kPct, seasonRow.bbPct))
        }

        for (const row of await fetchPitcherGameLog(player.id, season)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct) VALUES (?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.era, row.whip, row.kPct, row.bbPct))
        }

        for (const row of await fetchPitcherYearly(player.id, debutSeason, season - 1)) {
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct) VALUES (?,?,?,?,?,?,?)'
          ).bind(row.playerId, row.season, row.date, row.era, row.whip, row.kPct, row.bbPct))
        }

        await sleep(300)
      }

      if (stmts.length > 0) await db.batch(stmts)
    }

    return { result: `synced ${PLAYERS.length} players`, season }
  },
})
