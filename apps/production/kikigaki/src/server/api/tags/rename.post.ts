// タグの名前を変える（本人の議事録すべて）。変えた先が既にあれば1つにまとまる。

import { requireUser } from '~/server/utils/auth'
import { renameUserTag } from '~/server/utils/tags'
import { normalizeTag } from '~/utils/tags'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ from?: unknown; to?: unknown }>(event)
  const to = normalizeTag(body?.to)
  if (!to) throw createError({ statusCode: 400, message: '新しいタグの名前を入れてください。' })
  const changed = await renameUserTag(event, user.id, String(body?.from ?? ''), to)
  return { changed }
})
