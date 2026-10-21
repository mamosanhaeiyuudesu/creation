// ログイン確認の口。ID トークンを検証し、users に行を用意して返す。
// あわせて今月の利用量も返す（設定画面と、上限が近いときの案内に使う）。

import { requireUser } from '~/server/utils/auth'
import { loadUsageStatus } from '~/server/utils/usage'
import { isAdminId, isPending } from '~/server/utils/admin'
import { deleteAfterLabel, isDeletionDue, withdrawnKindOf } from '~/utils/withdrawal'
import type { WithdrawnInfo } from '~/types/auth'

export default defineEventHandler(async (event) => {
  // お休み中の人もここは通す（画面が「おかえりなさい」を出すために、お休み中かどうかを知る必要がある）
  const user = await requireUser(event, { allowWithdrawn: true })
  const withdrawn: WithdrawnInfo | null = user.withdrawnAt
    ? { kind: withdrawnKindOf(user.deleteAfter), deleteAfterLabel: deleteAfterLabel(user.deleteAfter), expired: isDeletionDue(user.deleteAfter) }
    : null
  const usage = await loadUsageStatus(event, user.id)
  // isAdmin は左メニューに「管理画面」を出すかどうかだけに使う（守りは /api/admin/* の入口で行う）
  // pendingApproval は「準備中です」の案内を出すためだけに使う（止めるのは requireEntitlement）
  return { user, withdrawn, usage, isAdmin: isAdminId(event, user.id), pendingApproval: await isPending(event, user.id) }
})
