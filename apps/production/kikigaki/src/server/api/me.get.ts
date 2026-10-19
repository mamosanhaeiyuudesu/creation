// ログイン確認の口。ID トークンを検証し、users に行を用意して返す。
// あわせて今月の利用量も返す（設定画面と、上限が近いときの案内に使う）。

import { requireUser } from '~/server/utils/auth'
import { loadUsageStatus } from '~/server/utils/usage'
import { isAdminId, isPending } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const usage = await loadUsageStatus(event, user.id)
  // isAdmin は左メニューに「管理画面」を出すかどうかだけに使う（守りは /api/admin/* の入口で行う）
  // pendingApproval は「準備中です」の案内を出すためだけに使う（止めるのは requireEntitlement）
  return { user, usage, isAdmin: isAdminId(event, user.id), pendingApproval: await isPending(event, user.id) }
})
