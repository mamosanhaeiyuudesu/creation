import { requireNikkiUser, requireNikkiDb } from '~/server/utils/nikki'
import { listNikkiCalendars } from '~/server/utils/nikki-google'

// 初期設定でカレンダーを選ぶための一覧（連携済みのアカウントが持つカレンダー）。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  await requireNikkiDb(event)
  return { calendars: await listNikkiCalendars(event, user.id) }
})
