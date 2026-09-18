import { requireNikkiUser, requireNikkiDb } from '~/server/utils/nikki'
import { saveNikkiCalendarIds } from '~/server/utils/nikki-google'

// ホームのカレンダーに出す対象を保存する（複数選択）。上限は NIKKI_MAX_CALENDARS で切られる。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  await requireNikkiDb(event)
  const body = await readBody<{ calendarIds?: unknown }>(event)
  const ids = Array.isArray(body?.calendarIds) ? (body.calendarIds as string[]) : []
  return { calendarIds: await saveNikkiCalendarIds(event, user.id, ids) }
})
