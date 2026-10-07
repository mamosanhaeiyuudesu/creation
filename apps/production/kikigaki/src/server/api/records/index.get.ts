// 本人の議事録の一覧。

import { requireUser } from '~/server/utils/auth'
import { listRecords } from '~/server/utils/minutes'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { records: await listRecords(event, user.id) }
})
