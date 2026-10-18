import { requireNikkiUser, requireNikkiDb, loadRange, NIKKI_EXPORT_MAX_DAYS } from '~/server/utils/nikki'
import { isNikkiDate } from '~/types/nikki'

/**
 * PDF 用に期間内の記録（日ごとのトピック）をまとめて返す。from/to を省くと全期間。
 * 返すのは新しい順。上限（NIKKI_EXPORT_MAX_DAYS）で切れたら truncated を立てる。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const q = getQuery(event)
  const from = isNikkiDate(q.from) ? q.from : undefined
  const to = isNikkiDate(q.to) ? q.to : undefined
  const days = await loadRange(event, db, user.id, { from, to })
  return { days, truncated: days.length >= NIKKI_EXPORT_MAX_DAYS }
})
