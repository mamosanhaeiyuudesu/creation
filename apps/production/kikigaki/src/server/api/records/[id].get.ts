// 議事録1件。他人のものは「見つかりません」で返す（存在するかどうかも知らせない）。

import { requireUser } from '~/server/utils/auth'
import { getRecord } from '~/server/utils/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const record = await getRecord(event, user.id, id)
  if (!record) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧からお選びください。' })
  }
  return { record }
})
