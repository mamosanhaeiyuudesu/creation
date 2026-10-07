// Stripe からの通知を受けて契約状態を保存する。**契約状態を書き込むのはここだけ。**
//
// 気をつけている点が4つある:
//
// ①署名検証を必ず行う。Workers には Node の crypto が無いので、SubtleCrypto を使う
//   非同期版 constructEventAsync を使う（同期版 constructEvent は Workers では動かない）。
// ②**生のまま**のリクエストボディで検証する。パースしたJSONを組み立て直すと署名が合わなくなる。
// ③二重処理をしない。イベントIDを stripe_events に INSERT OR IGNORE し、
//   すでに入っていた＝処理済みなら何もせず 200 を返す。
// ④途中で失敗したら、③で入れた記録を消してから 500 を返す（Stripe が送り直してくれる）。
//   記録を残したまま 500 にすると、再送が「処理済み」と判定されて永久に取りこぼす。
//
// ★この口はログイン不要（Stripe はこちらのログインを持っていない）。
//   守りは署名検証だけなので、requireUser を足さないこと。

import type Stripe from 'stripe'
import {
  createStripe,
  findUserIdByCustomer,
  getStripeConfig,
  markEventProcessed,
  releaseEventRecord,
  saveSubscriptionState,
  toJstDate,
} from '~/server/utils/stripe'

/** 顧客ID（文字列のことも、展開されたオブジェクトのこともある） */
function customerIdOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in (value as any)) return String((value as any).id)
  return ''
}

/**
 * 次回の支払日（UNIX秒）。
 * 2025年以降のAPIでは current_period_end は**サブスクリプションの明細（items）側**にある。
 * 古いAPIバージョンのイベントが届いても読めるよう、サブスクリプション直下も見る。
 */
function periodEndOf(sub: Stripe.Subscription): number {
  const fromItems = (sub.items?.data ?? [])
    .map((item: any) => Number(item?.current_period_end ?? 0))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (fromItems.length) return Math.max(...fromItems)
  return Number((sub as any).current_period_end ?? 0)
}

/** サブスクリプションの内容をD1へ写す。利用者が特定できなければ何もしない */
async function applySubscription(event: any, sub: Stripe.Subscription): Promise<void> {
  const customerId = customerIdOf(sub.customer)
  // 利用者の特定は metadata を第一に、無ければ顧客IDからDBを引く
  const userId = String(sub.metadata?.userId ?? '') || (await findUserIdByCustomer(event, customerId))
  if (!userId) {
    // 手でStripeの画面から作った契約など、こちらに紐付けようのないもの。
    // 投げ返すと再送がループするだけなので、ログに残して成功として扱う。
    console.warn('[kikigaki] 利用者が特定できない契約を受け取りました', { customerId, subscriptionId: sub.id })
    return
  }

  await saveSubscriptionState(event, userId, {
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    currentPeriodEnd: toJstDate(periodEndOf(sub)),
    cancelAtPeriodEnd: !!sub.cancel_at_period_end,
  })
}

export default defineEventHandler(async (event) => {
  const conf = getStripeConfig(event, 'webhook')
  const signature = getRequestHeader(event, 'stripe-signature') ?? ''
  const rawBody = await readRawBody(event, 'utf8')
  if (!signature || !rawBody) {
    throw createError({ statusCode: 400, message: 'Invalid request' })
  }

  const stripe = createStripe(conf.secretKey)
  let stripeEvent: Stripe.Event
  try {
    const { default: StripeLib } = await import('stripe')
    stripeEvent = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      conf.webhookSecret,
      undefined,
      StripeLib.createSubtleCryptoProvider()
    )
  } catch (err: any) {
    // 署名が合わないものは受け付けない（偽のイベントで契約状態を書き換えられないように）
    console.error('[kikigaki] Stripe webhook の署名検証に失敗:', err?.message ?? err)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // 署名を検証したあとで記録する（検証前に記録すると、偽のIDで本物のイベントを塞げてしまう）
  const fresh = await markEventProcessed(event, stripeEvent.id, stripeEvent.type)
  if (!fresh) {
    return { received: true, duplicate: true }
  }

  try {
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        // Checkout が終わった時点では、契約の詳細は subscription 側のイベントで届く。
        // ここでは「どの顧客がどの利用者か」を確実に結び付けておく
        // （customer.subscription.* が先に届いても拾えるように、取得して書き込む）。
        const session = stripeEvent.data.object as Stripe.Checkout.Session
        const subscriptionId = typeof session.subscription === 'string' ? session.subscription : ''
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId)
          await applySubscription(event, sub)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        // 解約（deleted）も同じ経路で保存する。status が canceled になるので利用可否が自然に切り替わる
        await applySubscription(event, stripeEvent.data.object as Stripe.Subscription)
        break
      }

      case 'invoice.payment_failed': {
        // 支払いが通らなかったとき。Stripe 側で status が past_due などに変わり、
        // その変更は customer.subscription.updated で届くので、ここではログだけ残す
        const invoice = stripeEvent.data.object as Stripe.Invoice
        console.warn('[kikigaki] 支払いに失敗しました', { customer: customerIdOf(invoice.customer) })
        break
      }

      default:
        // 興味のないイベントは黙って受け取る（Stripe 側の設定で絞り込めるが、届いても害は無い）
        break
    }
  } catch (err: any) {
    // 失敗したら記録を取り消して 500。Stripe が送り直してくれる
    await releaseEventRecord(event, stripeEvent.id).catch(() => {})
    console.error('[kikigaki] Stripe webhook の処理に失敗:', stripeEvent.type, err?.message ?? err)
    throw createError({ statusCode: 500, message: 'Webhook handling failed' })
  }

  return { received: true }
})
