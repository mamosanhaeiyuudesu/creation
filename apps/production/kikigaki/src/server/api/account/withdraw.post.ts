// 退会のうち「お休み」。議事録などは消さず、使えない状態にして期限なしで預かる。
// 契約は止める。詳細は server/utils/account.ts。Firebase のアカウントは消さない（再開でデータがつながるため）。

import { requireUser } from '~/server/utils/auth'
import { withdrawAccount } from '~/server/utils/account'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await withdrawAccount(event, user.id)
  return { ok: true }
})
