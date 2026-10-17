// 会議の名前だけを変える（一覧から）。本人の議事録だけ。

import { requireUser } from '~/server/utils/auth'
import { updateRecordTitle } from '~/server/utils/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ title?: unknown }>(event)
  const title = await updateRecordTitle(event, user.id, id, typeof body?.title === 'string' ? body.title : '')
  if (title === null) {
    throw createError({ statusCode: 404, message: 'この議事録は見つかりませんでした。一覧からお選びください。' })
  }
  return { title }
})
