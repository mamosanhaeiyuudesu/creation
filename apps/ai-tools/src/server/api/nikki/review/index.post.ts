import { requireNikkiUser, requireNikkiDb, loadBodiesRange, loadReviewPrompt } from '~/server/utils/nikki'
import { generateNikkiReview } from '~/server/utils/nikki-ai'
import { todayJST } from '~/utils/jst'

/** 直近1ヶ月（今日の1ヶ月前の翌日〜今日）の日記から、AIの振り返りを作る。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)

  const to = todayJST()
  const d = new Date(`${to}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() - 1)
  d.setUTCDate(d.getUTCDate() + 1)
  const from = d.toISOString().slice(0, 10)

  const days = await loadBodiesRange(event, db, user.id, { from, to })
  if (!days.length) throw createError({ statusCode: 400, message: '直近1ヶ月には記録がありません' })

  const prompt = await loadReviewPrompt(db, user.id)
  const items = await generateNikkiReview(event, { from, to, days, prompt })
  return { from, to, dayCount: days.length, items }
})
