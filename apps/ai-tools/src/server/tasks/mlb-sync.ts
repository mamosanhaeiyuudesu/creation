/**
 * Nitro server task — Cloudflare Cron Trigger から自動実行される
 * nuxt.config.ts の nitro.scheduledTasks で登録済み
 */

import { PLAYERS } from '~/utils/japanese-mlb-player/players'
import {
  FG_PLAYER_IDS,
  MLB_DEBUT_SEASONS,
  fetchFgBatterSeason,
  fetchFgPitcherSeason,
  fetchFgBatterYearly,
  fetchFgPitcherYearly,
  mapBatterRow,
  mapPitcherRow,
  sleep,
} from '../utils/fangraphs'

export default defineTask({
  meta: {
    name: 'mlb:sync',
    description: 'FanGraphsからMLB日本人選手成績を取得してD1に保存',
  },
  async run({ context }) {
    const db = (context as Record<string, unknown>)?.cloudflare?.env?.MLB_DB as D1Database | undefined
    if (!db) throw new Error('MLB_DB バインディングが見つかりません')

    const season = new Date().getFullYear()
    const today = new Date().toISOString().slice(0, 10)

    // 選手マスタを先に全件 upsert
    await db.batch(PLAYERS.map(p =>
      db.prepare(
        'INSERT OR REPLACE INTO mlb_players (id, name_ja, name_en, position, team, team_full, league) VALUES (?,?,?,?,?,?,?)'
      ).bind(p.id, p.nameJa, p.nameEn, p.position, p.team, p.teamFull, p.league)
    ))

    for (const player of PLAYERS) {
      const fgId = FG_PLAYER_IDS[player.id]
      if (!fgId) continue

      const debutSeason = MLB_DEBUT_SEASONS[player.id] ?? season
      const stmts: ReturnType<D1Database['prepare']>[] = []

      // 野手データ
      if (player.position === 'batter' || player.position === 'both') {
        const batterSeason = await fetchFgBatterSeason(fgId, season)
        if (batterSeason) {
          const row = mapBatterRow(batterSeason, player.id, season, '')
          const snap = mapBatterRow(batterSeason, player.id, season, today)
          for (const r of [row, snap]) {
            stmts.push(db.prepare(
              'INSERT OR REPLACE INTO mlb_batter_stats (player_id,season,date,avg,obp,ops,wrc_plus,bb_pct,k_pct,war) VALUES (?,?,?,?,?,?,?,?,?,?)'
            ).bind(r.playerId, r.season, r.date, r.avg, r.obp, r.ops, r.wrcPlus, r.bbPct, r.kPct, r.war))
          }
        }
        const yearly = await fetchFgBatterYearly(fgId, debutSeason, season - 1)
        for (const row of yearly) {
          if (!row.Season) continue
          const r = mapBatterRow(row, player.id, row.Season, '')
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_batter_stats (player_id,season,date,avg,obp,ops,wrc_plus,bb_pct,k_pct,war) VALUES (?,?,?,?,?,?,?,?,?,?)'
          ).bind(r.playerId, r.season, r.date, r.avg, r.obp, r.ops, r.wrcPlus, r.bbPct, r.kPct, r.war))
        }
        await sleep(600)
      }

      // 投手データ
      if (player.position === 'pitcher' || player.position === 'both') {
        const pitcherSeason = await fetchFgPitcherSeason(fgId, season)
        if (pitcherSeason) {
          const row = mapPitcherRow(pitcherSeason, player.id, season, '')
          const snap = mapPitcherRow(pitcherSeason, player.id, season, today)
          for (const r of [row, snap]) {
            stmts.push(db.prepare(
              'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id,season,date,era,fip,whip,k_pct,bb_pct,gb_pct,war) VALUES (?,?,?,?,?,?,?,?,?,?)'
            ).bind(r.playerId, r.season, r.date, r.era, r.fip, r.whip, r.kPct, r.bbPct, r.gbPct, r.war))
          }
        }
        const yearly = await fetchFgPitcherYearly(fgId, debutSeason, season - 1)
        for (const row of yearly) {
          if (!row.Season) continue
          const r = mapPitcherRow(row, player.id, row.Season, '')
          stmts.push(db.prepare(
            'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id,season,date,era,fip,whip,k_pct,bb_pct,gb_pct,war) VALUES (?,?,?,?,?,?,?,?,?,?)'
          ).bind(r.playerId, r.season, r.date, r.era, r.fip, r.whip, r.kPct, r.bbPct, r.gbPct, r.war))
        }
        await sleep(600)
      }

      if (stmts.length > 0) await db.batch(stmts)
    }

    return { result: `synced ${PLAYERS.length} players`, date: today }
  },
})
