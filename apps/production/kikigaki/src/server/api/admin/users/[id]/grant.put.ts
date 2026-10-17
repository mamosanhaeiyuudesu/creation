// 管理画面: 支払い不要の指定を付ける／外す。操作は admin_audit に記録される。

import { adminOf, saveGrant } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const admin = adminOf(event)
  const userId = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ freeAccess?: unknown; note?: unknown }>(event)
  if (typeof body?.freeAccess !== 'boolean') {
    throw createError({ statusCode: 400, message: 'freeAccess を true か false で指定してください。' })
  }
  await saveGrant(event, admin.id, userId, {
    freeAccess: body.freeAccess,
    note: typeof body.note === 'string' ? body.note : '',
  })
  return { ok: true }
})
