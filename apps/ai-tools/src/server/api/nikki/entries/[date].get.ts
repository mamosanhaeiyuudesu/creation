import { requireNikkiUser, requireNikkiDb, requireDate, loadEntry } from '~/server/utils/nikki'
import { listNikkiEvents } from '~/server/utils/nikki-google'

/**
 * 日付を選んだときの1日ぶん。その日の Google の予定も一緒に返す
 * （「予定を見ながら話す」のが入力の入り口なので、往復を分けない）。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const date = requireDate(getRouterParam(event, 'date'))

  // 翌日を [from, to) の to にする
  const next = new Date(`${date}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  const to = next.toISOString().slice(0, 10)

  const entry = await loadEntry(event, db, user.id, date)
  const { events } = await listNikkiEvents(event, user.id, date, to).catch((e) => {
    console.error('[nikki/entries] 予定の取得に失敗:', e?.message || e)
    return { events: [], calendarIds: [] as string[] }
  })

  return { entry, events }
})
