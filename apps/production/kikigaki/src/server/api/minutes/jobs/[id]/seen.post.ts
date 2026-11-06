// できた議事録を開いた・失敗のお知らせを閉じた＝もう知らせなくてよい

import { requireUser } from '~/server/utils/auth'
import { markJobSeen } from '~/server/utils/minuteJobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  await markJobSeen(event, user.id, String(getRouterParam(event, 'id') ?? ''))
  return { ok: true }
})
