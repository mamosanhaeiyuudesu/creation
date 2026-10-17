// タグを消す（本人の議事録すべてから外す。議事録そのものは消えない）。

import { requireUser } from '~/server/utils/auth'
import { renameUserTag } from '~/server/utils/tags'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const body = await readBody<{ tag?: unknown }>(event)
  const changed = await renameUserTag(event, user.id, String(body?.tag ?? ''), '')
  return { changed }
})
