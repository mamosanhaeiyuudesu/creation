// 退会のうち「すべて消してやめる」。削除を予約する（猶予は DELETION_GRACE_DAYS 日）。
// 猶予のあいだはログインして取り消せる（resume）。お休み中の人は画面から来ない（今すぐ消すを使う）。
// 契約は止める。Firebase のアカウントは残す（取り消せるように）。詳細は server/utils/account.ts。

import { requireUser } from '~/server/utils/auth'
import { scheduleDeletion } from '~/server/utils/account'
import { deleteAfterLabel } from '~/utils/withdrawal'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { deleteAfter } = await scheduleDeletion(event, user.id)
  return { ok: true, deleteAfterLabel: deleteAfterLabel(deleteAfter) }
})
