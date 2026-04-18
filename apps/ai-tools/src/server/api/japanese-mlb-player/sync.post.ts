/**
 * FanGraphs からデータを取得して D1 に書き込む同期エンドポイント。
 * 手動実行またはCloudflare Cron Triggerから呼び出す。
 *
 * Cron設定（wrangler.toml）:
 *   [triggers]
 *   crons = ["0 21 * * *"]  # 毎日6:00 JST（UTC 21:00前日）
 *
 * 実行:
 *   curl -X POST https://your-worker.workers.dev/api/japanese-mlb-player/sync
 *
 * 取得データ:
 *   - 今シーズン集計（date = ''）
 *   - 今日のスナップショット（date = YYYY-MM-DD）← 日次推移の蓄積
 *   - 年度別成績（date = '', 各シーズン）
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
} from '../../utils/fangraphs'

type D1Stmt = ReturnType<D1Database['prepare']>

function upsertBatter(db: D1Database, r: ReturnType<typeof mapBatterRow>): D1Stmt {
  return db.prepare(
    'INSERT OR REPLACE INTO mlb_batter_stats (player_id, season, date, avg, obp, ops, wrc_plus, bb_pct, k_pct, war) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(r.playerId, r.season, r.date, r.avg, r.obp, r.ops, r.wrcPlus, r.bbPct, r.kPct, r.war)
}

function upsertPitcher(db: D1Database, r: ReturnType<typeof mapPitcherRow>): D1Stmt {
  return db.prepare(
    'INSERT OR REPLACE INTO mlb_pitcher_stats (player_id, season, date, era, fip, whip, k_pct, bb_pct, gb_pct, war) VALUES (?,?,?,?,?,?,?,?,?,?)'
  ).bind(r.playerId, r.season, r.date, r.era, r.fip, r.whip, r.kPct, r.bbPct, r.gbPct, r.war)
}

export default defineEventHandler(async (event) => {
  const env = event.context.cloudflare?.env as Record<string, unknown> | undefined
  const db = env?.MLB_DB as D1Database | undefined

  if (!db) {
    throw createError({ statusCode: 503, statusMessage: 'MLB_DB バインディングが設定されていません。' })
  }

  const season = new Date().getFullYear()
  const today = new Date().toISOString().slice(0, 10)
  const results: { playerId: string; nameJa: string; status: string; detail?: string }[] = []

  // 選手マスタを先に全件 upsert（stats の外部キー制約を満たすため）
  await db.batch(PLAYERS.map(p =>
    db.prepare(
      'INSERT OR REPLACE INTO mlb_players (id, name_ja, name_en, position, team, team_full, league) VALUES (?,?,?,?,?,?,?)'
    ).bind(p.id, p.nameJa, p.nameEn, p.position, p.team, p.teamFull, p.league)
  ))

  for (const player of PLAYERS) {
    const fgId = FG_PLAYER_IDS[player.id]
    if (!fgId) {
      results.push({ playerId: player.id, nameJa: player.nameJa, status: 'skipped', detail: 'FanGraphs ID未設定' })
      continue
    }

    const debutSeason = MLB_DEBUT_SEASONS[player.id] ?? season
    const stmts: D1Stmt[] = []

    try {
      // ── 野手データ ────────────────────────────────────────
      if (player.position === 'batter' || player.position === 'both') {
        const batterSeason = await fetchFgBatterSeason(fgId, season)
        if (batterSeason) {
          stmts.push(upsertBatter(db, mapBatterRow(batterSeason, player.id, season, '')))
          stmts.push(upsertBatter(db, mapBatterRow(batterSeason, player.id, season, today)))
        }

        const batterYearly = await fetchFgBatterYearly(fgId, debutSeason, season - 1)
        for (const row of batterYearly) {
          const yr = row.Season
          if (!yr) continue
          stmts.push(upsertBatter(db, mapBatterRow(row, player.id, yr, '')))
        }

        await sleep(600)
      }

      // ── 投手データ ────────────────────────────────────────
      if (player.position === 'pitcher' || player.position === 'both') {
        const pitcherSeason = await fetchFgPitcherSeason(fgId, season)
        if (pitcherSeason) {
          stmts.push(upsertPitcher(db, mapPitcherRow(pitcherSeason, player.id, season, '')))
          stmts.push(upsertPitcher(db, mapPitcherRow(pitcherSeason, player.id, season, today)))
        }

        const pitcherYearly = await fetchFgPitcherYearly(fgId, debutSeason, season - 1)
        for (const row of pitcherYearly) {
          const yr = row.Season
          if (!yr) continue
          stmts.push(upsertPitcher(db, mapPitcherRow(row, player.id, yr, '')))
        }

        await sleep(600)
      }

      // D1 に一括書き込み
      if (stmts.length > 0) {
        await db.batch(stmts)
      }

      results.push({ playerId: player.id, nameJa: player.nameJa, status: 'ok', detail: `${stmts.length} rows` })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      results.push({ playerId: player.id, nameJa: player.nameJa, status: 'error', detail: msg })
    }
  }

  return { syncedAt: today, season, results }
})
