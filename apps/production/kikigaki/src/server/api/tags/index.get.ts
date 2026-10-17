// 本人が使っているタグと件数（多い順）。入力の候補と、左メニューのタグの管理に使う。

import { requireUser } from '~/server/utils/auth'
import { listUserTags } from '~/server/utils/tags'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return { tags: await listUserTags(event, user.id) }
})
