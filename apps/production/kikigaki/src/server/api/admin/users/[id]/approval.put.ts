// 管理画面: 承認する／取り消す（承認制のとき）。操作は admin_audit に記録される。

import { adminOf, saveApproval } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const admin = adminOf(event)
  const userId = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ approved?: unknown }>(event)
  if (typeof body?.approved !== 'boolean') {
    throw createError({ statusCode: 400, message: 'approved を true か false で指定してください。' })
  }
  await saveApproval(event, admin.id, userId, body.approved)
  return { ok: true }
})
