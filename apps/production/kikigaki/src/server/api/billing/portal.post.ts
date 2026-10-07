// 解約・支払い方法の変更は Stripe の Customer Portal に任せる（自前で解約画面を作らない）。

import { requireUser } from '~/server/utils/auth'
import { createStripe, getStripeConfig, loadSubscription, siteOrigin } from '~/server/utils/stripe'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const conf = getStripeConfig(event, 'api')

  const existing = await loadSubscription(event, user.id)
  const customerId = existing?.stripe_customer_id ?? ''
  if (!customerId) {
    // まだ一度もお支払いの手続きをしていない人。ポータルには入れないので案内を返す
    throw createError({
      statusCode: 400,
      message: 'まだお支払いの手続きがされていません。「お支払いの手続きをする」からお進みください。',
    })
  }

  const stripe = createStripe(conf.secretKey)
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteOrigin(event)}/settings`,
    locale: 'ja',
  })

  return { url: session.url }
})
