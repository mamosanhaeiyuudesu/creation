// Stripe まわり。
//
// ★決済画面・解約画面は自前で作らない。Checkout（ホスト型）と Customer Portal に任せる。
//   こちらが持つのは「どの利用者がどの契約状態か」だけ。
//
// ★Cloudflare Workers では Node の http / crypto が無いので、
//   fetch ベースの HTTP クライアントと SubtleCrypto のプロバイダを明示的に渡す。
//   （ローカル dev は Node で動くが、同じコードでそのまま動く）

import type { H3Event } from 'h3'
import Stripe from 'stripe'
import { requireDb, ensureTables } from '~/server/utils/db'
import { isActiveStatus, type BillingStatus } from '~/types/billing'
import { SERVICE } from '~/config/service'

export interface StripeConfig {
  secretKey: string
  webhookSecret: string
  priceId: string
}

/** 設定が足りないときは、利用者向けの文言で断る（原因はログへ） */
export function getStripeConfig(event: H3Event, need: 'api' | 'webhook'): StripeConfig {
  const cfg = useRuntimeConfig(event) as any
  const conf: StripeConfig = {
    secretKey: cfg.stripeSecretKey ?? '',
    webhookSecret: cfg.stripeWebhookSecret ?? '',
    priceId: cfg.stripePriceId ?? '',
  }
  const missing = need === 'webhook' ? !conf.secretKey || !conf.webhookSecret : !conf.secretKey || !conf.priceId
  if (missing) {
    console.error('[kikigaki] Stripe の設定が足りていません', {
      secretKey: !!conf.secretKey,
      webhookSecret: !!conf.webhookSecret,
      priceId: !!conf.priceId,
    })
    throw createError({
      statusCode: 503,
      message: 'ただいまお支払いの手続きができません。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return conf
}

export function createStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    // Workers には Node の http が無いので fetch を使う
    httpClient: Stripe.createFetchHttpClient(),
    // 1回の呼び出しに時間をかけすぎない（Workers の実行時間に収めるため）
    timeout: 20_000,
    maxNetworkRetries: 1,
  })
}

// ── D1: 契約状態 ────────────────────────────────────────

export interface SubscriptionRow {
  user_id: string
  stripe_customer_id: string
  stripe_subscription_id: string
  status: string
  current_period_end: string
  cancel_at_period_end: number
}

export async function loadSubscription(event: H3Event, userId: string): Promise<SubscriptionRow | null> {
  const db = requireDb(event)
  await ensureTables(db)
  return (await db
    .prepare(
      `SELECT user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end
       FROM subscriptions WHERE user_id = ?`
    )
    .bind(userId)
    .first()) as SubscriptionRow | null
}

/** Stripe の顧客IDから利用者を引く（webhook は顧客IDしか持っていないイベントもある） */
export async function findUserIdByCustomer(event: H3Event, customerId: string): Promise<string> {
  if (!customerId) return ''
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT user_id FROM subscriptions WHERE stripe_customer_id = ?')
    .bind(customerId)
    .first()) as { user_id: string } | null
  return row?.user_id ?? ''
}

/** 顧客IDだけを先に記録する（Checkout を始める前に呼ぶ） */
export async function saveCustomerId(event: H3Event, userId: string, customerId: string): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  await db
    .prepare(
      `INSERT INTO subscriptions (user_id, stripe_customer_id, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = excluded.stripe_customer_id, updated_at = datetime('now')`
    )
    .bind(userId, customerId)
    .run()
}

/** 契約状態を書き込む（webhook からのみ呼ぶ＝画面の操作では契約状態を書き換えない） */
export async function saveSubscriptionState(
  event: H3Event,
  userId: string,
  state: {
    customerId: string
    subscriptionId: string
    status: string
    currentPeriodEnd: string
    cancelAtPeriodEnd: boolean
  }
): Promise<void> {
  const db = requireDb(event)
  await ensureTables(db)
  await db
    .prepare(
      `INSERT INTO subscriptions
         (user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end, cancel_at_period_end, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT (user_id) DO UPDATE SET
         stripe_customer_id = excluded.stripe_customer_id,
         stripe_subscription_id = excluded.stripe_subscription_id,
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         cancel_at_period_end = excluded.cancel_at_period_end,
         updated_at = datetime('now')`
    )
    .bind(
      userId,
      state.customerId,
      state.subscriptionId,
      state.status,
      state.currentPeriodEnd,
      state.cancelAtPeriodEnd ? 1 : 0
    )
    .run()
}

/**
 * 同じイベントを2回処理しないための記録。
 * **まだ処理していなければ true**（＝処理してよい）を返す。
 * 署名を検証したあとに呼ぶこと（検証前に記録すると、偽のIDで本物のイベントを塞げてしまう）。
 */
export async function markEventProcessed(event: H3Event, eventId: string, type: string): Promise<boolean> {
  const db = requireDb(event)
  await ensureTables(db)
  const res = await db
    .prepare("INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, datetime('now'))")
    .bind(eventId, type)
    .run()
  return (res?.meta?.changes ?? 0) > 0
}

/**
 * 処理済みの記録を取り消す。
 * 処理の途中で失敗したときに呼ぶ＝Stripe が同じイベントを送り直してきたときに、
 * 「もう処理済み」と誤判定して取りこぼすのを防ぐ。
 */
export async function releaseEventRecord(event: H3Event, eventId: string): Promise<void> {
  const db = requireDb(event)
  await db.prepare('DELETE FROM stripe_events WHERE id = ?').bind(eventId).run()
}

/** UNIX 秒 → YYYY-MM-DD（JST）。0 や未設定なら空文字 */
export function toJstDate(unixSeconds: number | null | undefined): string {
  if (!unixSeconds) return ''
  const jst = new Date(unixSeconds * 1000 + 9 * 60 * 60 * 1000)
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${jst.getUTCFullYear()}-${m}-${d}`
}

/** 画面に返す契約状態 */
export async function buildBillingStatus(event: H3Event, userId: string, monitorMode: boolean): Promise<BillingStatus> {
  const row = await loadSubscription(event, userId)
  const status = row?.status ?? ''
  return {
    monitorMode,
    active: monitorMode || isActiveStatus(status),
    status,
    currentPeriodEnd: row?.current_period_end ?? '',
    cancelAtPeriodEnd: !!row?.cancel_at_period_end,
  }
}

/**
 * Checkout / Portal から戻ってくる先。
 * **いま開いているホストを使う**（設定値を優先すると、ローカルで試したときに本番へ飛ばされる）。
 * ホストが読めないときだけ設定値へ落とす。
 */
export function siteOrigin(event: H3Event): string {
  const host = getRequestHeader(event, 'host') ?? ''
  if (!host) return SERVICE.siteUrl.replace(/\/$/, '')
  const proto = getRequestHeader(event, 'x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
