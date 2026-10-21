// 退会。本人が左メニューから行う。3つの道がある（日数などは utils/withdrawal.ts）。
//
//   お休み（withdrawAccount）: データは消さず、使えない状態にして**期限なし**で預かる。
//     users.withdrawn_at に日時を入れるだけ（delete_after は空）。契約は止める。
//     ログインすれば「再開しますか？」が出て、再開すると元どおりに使える
//     （Firebase のアカウントは消さないので、uid が変わらずデータがつながる）。
//   すべて消してやめる（scheduleDeletion）: 削除を予約する。DELETION_GRACE_DAYS 日のあいだは取り消せる（resumeAccount）。
//     予約日を過ぎたものは、管理画面から消す（Cron が使えないため手動。admin.ts の purgeDueUser）。
//     Firebase のアカウントは予約中は残す（戻せるように）。
//   今すぐ消す（deleteAccount）: その場で全部消す。元に戻せない。Firebase のアカウントは画面側で本人のログインのまま消す。
//
// 以下は「消す」ときの話。
// 消すもの: 議事録（元の文章を含む）・設定・支払い不要の指定・承認・月の利用量・契約の控え・利用者の行。
// （001_init.sql の record_revisions はコードから一度も書き込まれておらず、ensureTables にも無いので対象外。
//   ローカルには表自体が無く、含めると batch ごと失敗する）
// 消さないもの:
//   - Stripe 側の顧客と請求の記録（お金の記録は法令で一定期間残す必要があるため。契約は先に止める）
//   - 管理画面の操作の記録（admin_audit。運営者の操作の記録なので残す。中身は利用者のIDとメモだけ）
//   - Firebase Authentication のアカウント（サーバーからは消せないので、画面側で本人のログインのまま消す）
//
// ★契約が生きていれば、データを消す**前に** Stripe で即時解約する。止められなければ何も消さずに断る
//   （データだけ消えて引き落としが続く、という最悪の状態を作らないため）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { createStripe, getStripeConfig, loadSubscription } from '~/server/utils/stripe'
import { deleteAfterFrom, isDeletionDue, toSqlDateTime } from '~/utils/withdrawal'

/** もう請求が起きない契約の状態 */
const ENDED_STATUSES = ['canceled', 'incomplete_expired']

export async function userExists(event: H3Event, userId: string): Promise<boolean> {
  if (!userId) return false
  const db = requireDb(event)
  await ensureTables(db)
  return !!(await db.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first())
}

async function cancelSubscriptionIfAny(event: H3Event, userId: string): Promise<void> {
  const sub = await loadSubscription(event, userId)
  const subscriptionId = sub?.stripe_subscription_id ?? ''
  if (!subscriptionId || ENDED_STATUSES.includes(sub?.status ?? '')) return

  const stripe = createStripe(getStripeConfig(event, 'api').secretKey)
  try {
    await stripe.subscriptions.cancel(subscriptionId)
  } catch (err: any) {
    // Stripe 側にもう無い契約なら、止める必要もない
    if (err?.code === 'resource_missing') return
    console.error('[kikigaki] 退会時の解約に失敗しました', { userId, subscriptionId, message: err?.message })
    throw createError({
      statusCode: 502,
      message: 'お支払いの契約を止められなかったため、削除を中止しました。少し時間をおいてから、もう一度お試しください。',
    })
  }
}

/** 本人のデータの表（user_id で持っているもの）。users の行は別に消す */
const USER_TABLES = ['records', 'record_tags', 'user_settings', 'user_grants', 'user_approvals', 'ai_usage_monthly', 'subscriptions']

/**
 * 本人のデータをすべて消す。extra には同じまとまり（batch）で流したい文（管理画面の操作の記録など）を渡す。
 * 契約が生きていれば先に止める。
 */
export async function deleteAccount(event: H3Event, userId: string, extra: any[] = []): Promise<void> {
  await cancelSubscriptionIfAny(event, userId)

  const db = requireDb(event)
  await ensureTables(db)
  // 1回のまとまり（batch）で消す＝途中で失敗して半分だけ消えた状態を残さない
  await db.batch([
    ...USER_TABLES.map((t) => db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(userId)),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
    ...extra,
  ])
}

interface WithdrawalRow {
  withdrawn_at: string
  delete_after: string
}

async function loadWithdrawal(event: H3Event, userId: string): Promise<WithdrawalRow> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db.prepare('SELECT withdrawn_at, delete_after FROM users WHERE id = ?').bind(userId).first()) as WithdrawalRow | null
  if (!row) throw createError({ statusCode: 404, message: '利用者が見つかりませんでした。' })
  return row
}

/**
 * お休みに入る。データは残し、契約だけ止める（止められなければ何も変えずに断る）。期限はない。
 * すでに退会中（お休み・削除予約）なら何もしない。
 */
export async function withdrawAccount(event: H3Event, userId: string): Promise<void> {
  const row = await loadWithdrawal(event, userId)
  if (row.withdrawn_at) return

  await cancelSubscriptionIfAny(event, userId)

  const db = requireDb(event)
  await db.prepare('UPDATE users SET withdrawn_at = ?, delete_after = ? WHERE id = ?').bind(toSqlDateTime(new Date()), '', userId).run()
}

/**
 * 「すべて消してやめる」。削除を予約する（DELETION_GRACE_DAYS 日後）。契約は止める。
 * お休み中から予約に切り替えてもよい。すでに予約中なら日付を延ばさない。
 */
export async function scheduleDeletion(event: H3Event, userId: string): Promise<{ deleteAfter: string }> {
  const row = await loadWithdrawal(event, userId)
  if (row.delete_after) return { deleteAfter: row.delete_after }

  await cancelSubscriptionIfAny(event, userId)

  const now = new Date()
  const deleteAfter = deleteAfterFrom(now)
  const db = requireDb(event)
  await db
    .prepare('UPDATE users SET withdrawn_at = ?, delete_after = ? WHERE id = ?')
    .bind(row.withdrawn_at || toSqlDateTime(now), deleteAfter, userId)
    .run()
  return { deleteAfter }
}

/**
 * 退会から戻る（お休みの再開・削除予約の取り消し）。削除予定日を過ぎていたら戻せない
 * （約束した日を過ぎたものは管理画面で消す対象なので、戻すと約束が崩れる）。退会中でなければ何もしない。
 */
export async function resumeAccount(event: H3Event, userId: string): Promise<void> {
  const row = await loadWithdrawal(event, userId)
  if (!row.withdrawn_at) return
  if (isDeletionDue(row.delete_after)) {
    throw createError({
      statusCode: 410,
      message: '削除の予定日を過ぎたため、前の議事録はお戻しできません。お手数ですが、いったんすべて消してから、あらためて登録してください。',
    })
  }
  const db = requireDb(event)
  await db.prepare("UPDATE users SET withdrawn_at = '', delete_after = '' WHERE id = ?").bind(userId).run()
}
