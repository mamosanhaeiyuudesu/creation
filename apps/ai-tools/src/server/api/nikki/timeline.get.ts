import { requireNikkiUser, requireNikkiDb, loadTimeline } from '~/server/utils/nikki'
import { isNikkiDate } from '~/types/nikki'

/**
 * 画面下部のタイムライン（横並び）。新しい順に返すので、画面側は右端を最新にして並べる。
 * before を渡すとその日より前だけ返す＝左（過去）へスクロールしたときの追い読み。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)

  const q = getQuery(event)
  const before = isNikkiDate(q.before) ? (q.before as string) : undefined
  const limit = Math.min(60, Math.max(1, Number(q.limit ?? 14) || 14))

  const days = await loadTimeline(event, db, user.id, { before, limit })
  // hasMore は「返した件数が limit に達した」で判断する（総件数を数える1クエリを増やさないため）
  return { days, hasMore: days.length === limit }
})
