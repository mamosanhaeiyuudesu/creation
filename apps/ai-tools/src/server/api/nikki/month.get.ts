import { requireNikkiUser, requireNikkiDb, loadMonthMarks } from '~/server/utils/nikki'
import { listNikkiEvents } from '~/server/utils/nikki-google'

/**
 * 月表示に必要なものを1回で返す（?month=YYYY-MM）。
 * ・marks: その月で日記を書いた日
 * ・events: 選んだカレンダーの予定（Googleから都度取得。D1には保存しない）
 *
 * 予定と印を別APIにすると月を送るたびに往復が2回になるのでまとめている。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)

  const month = String(getQuery(event).month ?? '')
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw createError({ statusCode: 400, message: '月の形式が不正です（YYYY-MM）' })
  }

  const y = Number(month.slice(0, 4))
  const m = Number(month.slice(5, 7))
  const from = `${month}-01`
  // 翌月1日（12月なら翌年1月）。[from, to) の半開区間で取る
  const to = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`

  const marks = await loadMonthMarks(db, user.id, month)
  // 未連携・カレンダー未選択なら予定は空（連携していなくても日記は使える）
  const { events, calendarIds } = await listNikkiEvents(event, user.id, from, to).catch((e) => {
    console.error('[nikki/month] 予定の取得に失敗:', e?.message || e)
    return { events: [], calendarIds: [] as string[] }
  })

  return { month, marks, events, calendarIds }
})
