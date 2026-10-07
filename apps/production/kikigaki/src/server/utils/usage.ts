// 月間の利用上限。想定外の高額請求（AI代）を防ぐための歯止め。
//
// 上限値は src/config/service.ts の SERVICE.limits で変える。
// 数えているのは2つ:
//   ① 文字起こしした音声の長さ（秒）… OpenAI の請求に直結する
//   ② 議事録をつくった回数        … Claude の請求に直結する
//
// 月の区切りは JST（利用者の感覚に合わせる）。超過したら処理を**始める前に**断る
// （途中まで動かしてから断ると、API代だけ払って結果が出ない）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { SERVICE } from '~/config/service'
import { jstYearMonth } from '~/utils/formatDate'

export interface UsageTotals {
  /** 今月すでに文字起こしした秒数 */
  seconds: number
  /** 今月つくった議事録の件数 */
  records: number
}

export interface UsageStatus extends UsageTotals {
  limitMinutes: number
  limitRecords: number
  /** 残りの分数（0未満にはしない） */
  remainingMinutes: number
  remainingRecords: number
}

export async function loadUsage(event: H3Event, userId: string): Promise<UsageTotals> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT seconds, records FROM usage_monthly WHERE user_id = ? AND ym = ?')
    .bind(userId, jstYearMonth())
    .first()) as { seconds: number; records: number } | null
  return { seconds: row?.seconds ?? 0, records: row?.records ?? 0 }
}

export async function loadUsageStatus(event: H3Event, userId: string): Promise<UsageStatus> {
  const totals = await loadUsage(event, userId)
  const { monthlyMinutes, monthlyRecords } = SERVICE.limits
  return {
    ...totals,
    limitMinutes: monthlyMinutes,
    limitRecords: monthlyRecords,
    remainingMinutes: Math.max(0, monthlyMinutes - Math.ceil(totals.seconds / 60)),
    remainingRecords: Math.max(0, monthlyRecords - totals.records),
  }
}

/** 使ったぶんを足す。行が無ければ作る */
export async function addUsage(
  event: H3Event,
  userId: string,
  add: { seconds?: number; records?: number }
): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  const seconds = Math.max(0, Math.round(add.seconds ?? 0))
  const records = Math.max(0, Math.round(add.records ?? 0))
  if (!seconds && !records) return
  await db
    .prepare(
      `INSERT INTO usage_monthly (user_id, ym, seconds, records, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT (user_id, ym) DO UPDATE SET
         seconds = seconds + excluded.seconds,
         records = records + excluded.records,
         updated_at = datetime('now')`
    )
    .bind(userId, jstYearMonth(), seconds, records)
    .run()
}

/** 上限に達したときの文言。原因ではなく「いつまた使えるか」を書く */
function limitReached(what: string): never {
  throw createError({
    statusCode: 429,
    message: `今月${what}のご利用ぶんを使い切りました。来月1日から、またお使いいただけます。`,
  })
}

/**
 * 文字起こしを始めてよいか。音声の長さが分かる前に呼ぶので、残りが0かどうかだけを見る
 * （1回の送信で上限を少し超えるのは許す＝途中のチャンクだけ失敗して議事録が歯抜けになるより良い）。
 */
export async function requireTranscribeAllowance(event: H3Event, userId: string): Promise<void> {
  const status = await loadUsageStatus(event, userId)
  if (status.remainingMinutes <= 0) limitReached('の録音')
}

/** 議事録をつくってよいか */
export async function requireRecordAllowance(event: H3Event, userId: string): Promise<void> {
  const status = await loadUsageStatus(event, userId)
  if (status.remainingRecords <= 0) limitReached('つくれる議事録')
}
