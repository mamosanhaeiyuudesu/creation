// ログイン確認の口。ID トークンを検証し、users に行を用意して返す。
// あわせて今月の利用ぶんも返す（設定画面と、上限が近いときの案内に使う）。

import { requireUser } from '~/server/utils/auth'
import { loadUsageStatus } from '~/server/utils/usage'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const usage = await loadUsageStatus(event, user.id)
  return { user, usage }
})
