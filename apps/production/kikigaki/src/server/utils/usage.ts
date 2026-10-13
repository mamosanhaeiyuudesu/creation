// 月間の利用上限。想定外の高額請求（AI代）を防ぐための歯止め。
//
// 上限値は src/config/service.ts の SERVICE.limits で変える。
// 数えているのは1つ:
//   議事録をつくった回数 … Claude の請求に直結する
//
// 月の区切りは JST（利用者の感覚に合わせる）。超過したら処理を**始める前に**断る
// （途中まで動かしてから断ると、API代だけ払って結果が出ない）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { SERVICE } from '~/config/service'
import { jstYearMonth } from '~/utils/formatDate'

export interface UsageTotals {
  /** 今月つくった議事録の件数 */
  records: number
}

export interface UsageStatus extends UsageTotals {
  limitRecords: number
  remainingRecords: number
}

export async function loadUsage(event: H3Event, userId: string): Promise<UsageTotals> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT records FROM usage_monthly WHERE user_id = ? AND ym = ?')
    .bind(userId, jstYearMonth())
    .first()) as { records: number } | null
  return { records: row?.records ?? 0 }
}

export async function loadUsageStatus(event: H3Event, userId: string): Promise<UsageStatus> {
  const totals = await loadUsage(event, userId)
  const { monthlyRecords } = SERVICE.limits
  return {
    ...totals,
    limitRecords: monthlyRecords,
    remainingRecords: Math.max(0, monthlyRecords - totals.records),
  }
}

/** 使ったぶんを足す。行が無ければ作る */
export async function addUsage(
  event: H3Event,
  userId: string,
  add: { records?: number }
): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const records = Math.max(0, Math.round(add.records ?? 0))
  if (!records) return
  await db
    .prepare(
      `INSERT INTO usage_monthly (user_id, ym, records, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, ym) DO UPDATE SET
         records = records + excluded.records,
         updated_at = datetime('now')`
    )
    .bind(userId, jstYearMonth(), records)
    .run()
}

/** 上限に達したときの文言。原因ではなく「いつまた使えるか」を書く */
function limitReached(what: string): never {
  throw createError({
    statusCode: 429,
    message: `今月${what}のご利用ぶんを使い切りました。来月1日から、またお使いいただけます。`,
  })
}

/** 議事録をつくってよいか */
export async function requireRecordAllowance(event: H3Event, userId: string): Promise<void> {
  const status = await loadUsageStatus(event, userId)
  if (status.remainingRecords <= 0) limitReached('つくれる議事録')
}

/**
 * 「AIで直す」を使ってよいか。使ってよければ回数を1つ進める（AIを呼ぶ前に数える＝失敗しても戻さない）。
 * 数え方は議事録1件につき通算（月で戻さない）。
 */
export async function consumeRevision(event: H3Event, userId: string, recordId: string): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const max = SERVICE.limits.revisionsPerRecord
  const row = (await db
    .prepare('SELECT count FROM record_revisions WHERE record_id = ? AND user_id = ?')
    .bind(recordId, userId)
    .first()) as { count: number } | null
  if ((row?.count ?? 0) >= max) {
    throw createError({
      statusCode: 429,
      message: `この議事録で「AIに直してもらう」を使えるのは${max}回までです。あとは画面で直接なおしてください。`,
    })
  }
  await db
    .prepare(
      `INSERT INTO record_revisions (record_id, user_id, count, updated_at)
       VALUES (?, ?, 1, datetime('now'))
       ON CONFLICT (record_id) DO UPDATE SET count = count + 1, updated_at = datetime('now')`
    )
    .bind(recordId, userId)
    .run()
}
