// 議事録を消す。消せるのは本人のものだけ（元に戻せないので、画面側で確認を取ってから呼ぶ）。

import { requireUser } from '~/server/utils/auth'
import { deleteRecord } from '~/server/utils/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const deleted = await deleteRecord(event, user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧を開き直してください。' })
  }
  return { ok: true }
})
