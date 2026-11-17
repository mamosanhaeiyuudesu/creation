import { requireNikkiUser, requireNikkiDb, loadBodiesRange, loadReviewPrompt } from '~/server/utils/nikki'
import { generateNikkiReview } from '~/server/utils/nikki-ai'
import { todayJST } from '~/utils/jst'
import {
  NIKKI_REVIEW_RANGES,
  NIKKI_REVIEW_DEFAULT_RANGE,
  isNikkiReviewRangeId,
  addDaysYmd,
} from '~/utils/nikki-review-range'


/** 選んだ期間（既定は今日を含む直近1週間）の日記から、AIの振り返りを作る。 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const body = (await readBody(event).catch(() => null)) as { range?: string; from?: string; to?: string } | null

  const today = todayJST()
  const range = isNikkiReviewRangeId(body?.range) ? body!.range : NIKKI_REVIEW_DEFAULT_RANGE
  const def = NIKKI_REVIEW_RANGES.find((r) => r.id === range)!

  let from: string
  let to = today
  if (range === 'all') {
    from = '0000-01-01'
  } else {
    from = addDaysYmd(today, -(def.days - 1))
  }

  const days = await loadBodiesRange(event, db, user.id, { from, to })
  if (!days.length) throw createError({ statusCode: 400, message: `${def.label}には記録がありません` })

  const prompt = await loadReviewPrompt(db, user.id)
  // 全期間は最初の記録の日から表示する
  const shownFrom = range === 'all' ? days[0]!.date : from
  const items = await generateNikkiReview(event, { from: shownFrom, to, days, prompt })
  return { from: shownFrom, to, dayCount: days.length, items }
})
