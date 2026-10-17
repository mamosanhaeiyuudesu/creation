// お支払いの手続き。Stripe Checkout（ホスト型）のURLを作って返すだけ。
// 決済画面は自前で作らない＝カード番号がこちらのサーバーを通らない。

import { requireUser } from '~/server/utils/auth'
import { SERVICE } from '~/config/service'
import { isTrialEligible } from '~/utils/entitlement'
import {
  createStripe,
  getStripeConfig,
  loadSubscription,
  saveCustomerId,
  siteOrigin,
} from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conf = getStripeConfig(event, 'api')
  const stripe = createStripe(conf.secretKey)
  const origin = siteOrigin(event)

  // 顧客は1人につき1つ。すでに作ってあれば使い回す（毎回作ると Stripe 側に重複が溜まる）
  const existing = await loadSubscription(event, user.id)
  let customerId = existing?.stripe_customer_id ?? ''
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.displayName || undefined,
      // webhook はこの metadata を頼りに利用者を特定する（顧客IDからも引けるようにDBにも保存する）
      metadata: { userId: user.id },
    })
    customerId = customer.id
    await saveCustomerId(event, user.id, customerId)
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: conf.priceId, quantity: 1 }],
    // 戻り先。手続きが済んだことが分かるよう設定画面へ返す
    success_url: `${origin}/settings?paid=1`,
    cancel_url: `${origin}/settings`,
    // Checkout 経由の契約にも利用者を書いておく（webhook の取りこぼし対策）。
    // 初めての契約なら無料期間を付ける。カードはこの画面で登録してもらい、期間が終わると自動で引き落とす
    // （trial_period_days を付けても、mode=subscription の Checkout は既定でカードを集める）
    subscription_data: {
      metadata: { userId: user.id },
      ...(isTrialEligible({ trialDays: SERVICE.trialDays, subscriptionId: existing?.stripe_subscription_id ?? '' })
        ? { trial_period_days: SERVICE.trialDays }
        : {}),
    },
    locale: 'ja',
  })

  if (!session.url) {
    throw createError({
      statusCode: 502,
      message: 'お支払いの画面をひらけませんでした。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return { url: session.url }
})
