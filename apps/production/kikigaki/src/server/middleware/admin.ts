// /api/admin/* の入口。管理者でなければ 404 で止め、通れば event.context.kkAdmin に本人を置く。
// API ごとに判定を書くと、新しい API を足したときに書き忘れるので、ここで一律に止める。

import { requireAdmin } from '~/server/utils/admin'

export default defineEventHandler(async (event) => {
  if (!/^\/api\/admin(\/|\?|$)/.test(event.path)) return
  ;(event.context as any).kkAdmin = await requireAdmin(event)
})
