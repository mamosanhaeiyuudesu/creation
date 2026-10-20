// 管理画面: 預かる期限を過ぎたお休み中の利用者のデータを消す。操作は admin_audit に記録される。

import { adminOf, purgeExpiredUser } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const admin = adminOf(event)
  const userId = getRouterParam(event, 'id') ?? ''
  await purgeExpiredUser(event, admin.id, userId)
  return { ok: true }
})
