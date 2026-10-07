// いまの契約状態。画面はこれを見てボタンを出し分ける。

import { requireUser } from '~/server/utils/auth'
import { buildBillingStatus } from '~/server/utils/stripe'
import { isMonitorMode } from '~/server/utils/entitlement'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return await buildBillingStatus(event, user.id, isMonitorMode(event))
})
