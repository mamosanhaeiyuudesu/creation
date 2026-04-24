/**
 * MLB Stats API からデータを取得して D1 に書き込む同期エンドポイント。
 * 手動実行または Cloudflare Cron Trigger から呼び出す。
 *
 * ゲームログを蓄積して日次スナップショットを生成するため、
 * 初回実行で今シーズンの全過去日付データも一括バックフィルされる。
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
} from '../../utils/mlbstats'

type D1Stmt = ReturnType<D1Database['prepare']>

function upsertBatter(db: D1Database, r: { playerId: string; season: number; date: string; avg: number | null; obp: number | null; ops: number | null; bbPct: number | null; kPct: number | null }): D1Stmt {
  return db.prepare(
    'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, ops, bb_pct, k_pct) VALUES (?,?,?,?,?,?,?,?)'
  ).bind(r.playerId, r.season, r.date, r.avg, r.obp, r.ops, r.bbPct, r.kPct)
}

function upsertPitcher(db: D1Database, r: { playerId: string; season: number; date: string; era: number | null; whip: number | null; kPct: number | null; bbPct: number | null }): D1Stmt {
  return db.prepare(
    'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, whip, k_pct, bb_pct) VALUES (?,?,?,?,?,?,?)'
  ).bind(r.playerId, r.season, r.date, r.era, r.whip, r.kPct, r.bbPct)
}

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'MLB_DB バインディングが設定されていません。' })
  }

  const season = new Date().getFullYear()
  const results: { playerId: string; nameJa: string; status: string; detail?: string }[] = []

  // 選手マスタを先に全件 upsert
  await db.batch(PLAYERS.map(p =>
    db.prepare(
      'INSERT OR REPLACE INTO mlb_players (id, name_ja, name_en, position, team, team_full, league) VALUES (?,?,?,?,?,?,?)'
    ).bind(p.id, p.nameJa, p.nameEn, p.position, p.team, p.teamFull, p.league)
  ))

  for (const player of PLAYERS) {
    const debutSeason = MLB_DEBUT_SEASONS[player.id] ?? season
    const stmts: D1Stmt[] = []

    try {
      // ── 野手データ ────────────────────────────────────────
      if (player.position === 'batter' || player.position === 'both') {
        // 現シーズン集計（date = ''）
        const seasonRow = await fetchBatterSeason(player.id, season)
        if (seasonRow) stmts.push(upsertBatter(db, seasonRow))

        // 今シーズンのゲームログ → 日次スナップショット（全過去日付を一括バックフィル）
        const gameLogs = await fetchBatterGameLog(player.id, season)
        for (const row of gameLogs) stmts.push(upsertBatter(db, row))

        // 年度別成績（date = '', 各シーズン）
        const yearly = await fetchBatterYearly(player.id, debutSeason, season - 1)
        for (const row of yearly) stmts.push(upsertBatter(db, row))

        await sleep(300)
      }

      // ── 投手データ ────────────────────────────────────────
      if (player.position === 'pitcher' || player.position === 'both') {
        const seasonRow = await fetchPitcherSeason(player.id, season)
        if (seasonRow) stmts.push(upsertPitcher(db, seasonRow))

        const gameLogs = await fetchPitcherGameLog(player.id, season)
        for (const row of gameLogs) stmts.push(upsertPitcher(db, row))

        const yearly = await fetchPitcherYearly(player.id, debutSeason, season - 1)
        for (const row of yearly) stmts.push(upsertPitcher(db, row))

        await sleep(300)
      }

      if (stmts.length > 0) await db.batch(stmts)
      results.push({ playerId: player.id, nameJa: player.nameJa, status: 'ok', detail: `${stmts.length} rows` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ playerId: player.id, nameJa: player.nameJa, status: 'error', detail: msg })
    }
  }

  return { syncedAt: new Date().toISOString().slice(0, 10), season, results }
})
