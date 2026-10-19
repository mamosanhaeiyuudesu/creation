// 管理画面: 今月のAI利用量を0に戻す。操作は admin_audit に記録される。

import { adminOf, resetAiUsage } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const admin = adminOf(event)
  const userId = getRouterParam(event, 'id') ?? ''
  await resetAiUsage(event, admin.id, userId)
  return { ok: true }
})
