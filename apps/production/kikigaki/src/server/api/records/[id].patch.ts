// 確認画面での編集を保存する。議事録はいつでも直せる（固定される状態を持たない）。

import { requireUser } from '~/server/utils/auth'
import { normalizeMinutes, updateRecordMinutes } from '~/server/utils/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ minutes?: unknown }>(event)

  // クライアントから来たJSONはそのまま信じず正規化してから保存する
  const minutes = normalizeMinutes(body?.minutes)
  const saved = await updateRecordMinutes(event, user.id, id, minutes)
  if (!saved) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧からお選びください。' })
  }
  return { minutes }
})
