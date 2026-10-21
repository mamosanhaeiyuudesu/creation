// 管理画面: 削除予定日を過ぎた削除予約中の利用者のデータを消す。操作は admin_audit に記録される。

import { adminOf, purgeDueUser } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const admin = adminOf(event)
  const userId = getRouterParam(event, 'id') ?? ''
  await purgeDueUser(event, admin.id, userId)
  return { ok: true }
})
