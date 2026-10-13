// 月間の利用量（AI代）のメーター。想定外の高額請求を防ぐための歯止め。
//
// 件数や回数ではなく、実際に使ったトークン量（＝AI代）で数える。
// 5万字の議事録も500字の議事録も1件、という数え方だと費用と食い違うため。
//
//   - Claude を呼ぶたびに、応答に付いてくる使用トークン数から費用を求めて足す（callClaudeText）
//   - 上限は src/config/service.ts の SERVICE.limits.monthlyBudgetUsd
//   - 利用者には金額を見せず、割合（％）だけ見せる
//
// 月の区切りは JST。超過していたら処理を**始める前に**断る
// （途中まで動かしてから断ると、API代だけ払って結果が出ない）。
// 1回の呼び出しで上限を少し超えるのは許す（その1回の費用は数十円まで）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { SERVICE } from '~/config/service'
import { jstYearMonth } from '~/utils/formatDate'

/**
 * 単価（USD / 100万トークン）。Sonnet 5.5 の価格（2026-10 時点）。モデルや価格を変えたらここも直す。
 * 内部では整数で持つため、1単位 = 0.1マイクロドル（= 10^-7 USD）にしている。
 */
const PRICE_PER_MTOK = { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }
const UNITS_PER_USD = 10_000_000

export interface TokenUsage {
  input_tokens?: number
  output_tokens?: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

/** 使用トークン数 → 費用の単位数 */
export function costUnits(u: TokenUsage): number {
  // 単価（USD/MTok）× トークン数 ÷ 100万 × UNITS_PER_USD = 単価 × トークン数 × 10
  const per = UNITS_PER_USD / 1_000_000
  const cost =
    (u.input_tokens ?? 0) * PRICE_PER_MTOK.input * per +
    (u.output_tokens ?? 0) * PRICE_PER_MTOK.output * per +
    (u.cache_read_input_tokens ?? 0) * PRICE_PER_MTOK.cacheRead * per +
    (u.cache_creation_input_tokens ?? 0) * PRICE_PER_MTOK.cacheWrite * per
  return Math.max(0, Math.round(cost))
}

export interface UsageStatus {
  /** 今月の使用量（上限に対する割合。0〜100の整数、100で頭打ち） */
  usedPercent: number
  /** 上限に達しているか */
  exhausted: boolean
}

export function budgetUnits(): number {
  return Math.round(SERVICE.limits.monthlyBudgetUsd * UNITS_PER_USD)
}

/** 割合の計算（純粋関数。テスト用に切り出している） */
export function toStatus(usedUnits: number, budget = budgetUnits()): UsageStatus {
  const ratio = budget > 0 ? usedUnits / budget : 1
  return { usedPercent: Math.min(100, Math.floor(ratio * 100)), exhausted: usedUnits >= budget }
}

async function loadUsedUnits(event: H3Event, userId: string): Promise<number> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT cost_units FROM ai_usage_monthly WHERE user_id = ? AND ym = ?')
    .bind(userId, jstYearMonth())
    .first()) as { cost_units: number } | null
  return row?.cost_units ?? 0
}

export async function loadUsageStatus(event: H3Event, userId: string): Promise<UsageStatus> {
  return toStatus(await loadUsedUnits(event, userId))
}

/** AIを呼んでよいか。上限に達していたら 429 */
export async function requireAiAllowance(event: H3Event, userId: string): Promise<void> {
  if ((await loadUsageStatus(event, userId)).exhausted) {
    throw createError({
      statusCode: 429,
      message: '今月のご利用ぶんを使い切りました。来月1日から、またお使いいただけます。',
    })
  }
}

/** 使ったぶんを足す。行が無ければ作る */
export async function addAiUsage(event: H3Event, userId: string, usage: TokenUsage): Promise<void> {
  const units = costUnits(usage)
  if (!units) return
  const db = requireDb(event)
  await ensureTables(db)
  await db
    .prepare(
      `INSERT INTO ai_usage_monthly (user_id, ym, cost_units, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, ym) DO UPDATE SET
         cost_units = cost_units + excluded.cost_units,
         updated_at = datetime('now')`
    )
    .bind(userId, jstYearMonth(), units)
    .run()
}
