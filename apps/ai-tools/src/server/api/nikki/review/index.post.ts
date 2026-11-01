import { requireNikkiUser, requireNikkiDb, loadBodiesRange, loadReviewPrompt } from '~/server/utils/nikki'
import { generateNikkiReview } from '~/server/utils/nikki-ai'
import { todayJST } from '~/utils/jst'

/** 直近2週間（今日を含む14日間）の日記から、AIの振り返りを作る。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)

  const to = todayJST()
  const d = new Date(`${to}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - 13)
  const from = d.toISOString().slice(0, 10)

  const days = await loadBodiesRange(event, db, user.id, { from, to })
  if (!days.length) throw createError({ statusCode: 400, message: '直近2週間には記録がありません' })

  const prompt = await loadReviewPrompt(db, user.id)
  const items = await generateNikkiReview(event, { from, to, days, prompt })
  return { from, to, dayCount: days.length, items }
})
