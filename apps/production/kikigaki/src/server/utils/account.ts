// アカウントの削除（退会）。本人が左メニューから行う。
//
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

export async function deleteAccount(event: H3Event, userId: string): Promise<void> {
  await cancelSubscriptionIfAny(event, userId)

  const db = requireDb(event)
  await ensureTables(db)
  // 1回のまとまり（batch）で消す＝途中で失敗して半分だけ消えた状態を残さない
  const tables = ['records', 'user_settings', 'user_grants', 'user_approvals', 'ai_usage_monthly', 'subscriptions']
  await db.batch([
    ...tables.map((t) => db.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(userId)),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ])
}
