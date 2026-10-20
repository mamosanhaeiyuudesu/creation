// お休みからの再開。預かっている議事録などがそのまま使えるようになる。
// お休み中の人だけが通れる口なので allowWithdrawn。契約は自動では再開しない（有料モードなら設定画面から申し込む）。

import { requireUser } from '~/server/utils/auth'
import { resumeAccount } from '~/server/utils/account'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { allowWithdrawn: true })
  await resumeAccount(event, user.id)
  return { ok: true }
})
