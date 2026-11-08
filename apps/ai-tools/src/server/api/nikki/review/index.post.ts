import { requireNikkiUser, requireNikkiDb, loadBodiesRange, loadReviewPrompt } from '~/server/utils/nikki'
import { generateNikkiReview } from '~/server/utils/nikki-ai'
import { todayJST } from '~/utils/jst'
import {
  NIKKI_REVIEW_RANGES,
  NIKKI_REVIEW_DEFAULT_RANGE,
  isNikkiReviewRangeId,
  addDaysYmd,
} from '~/utils/nikki-review-range'

const YMD = /^\d{4}-\d{2}-\d{2}$/

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
  } else if (range === 'custom') {
    if (!body?.from || !body?.to || !YMD.test(body.from) || !YMD.test(body.to)) {
      throw createError({ statusCode: 400, message: '期間の開始日と終了日を選んでください' })
    }
    if (body.from > body.to) throw createError({ statusCode: 400, message: '開始日が終了日より後になっています' })
    from = body.from
    to = body.to
  } else {
    from = addDaysYmd(today, -(def.days - 1))
  }

  const days = await loadBodiesRange(event, db, user.id, { from, to })
  if (!days.length) throw createError({ statusCode: 400, message: `${def.label === '自由選択' ? '選んだ期間' : def.label}には記録がありません` })

  const prompt = await loadReviewPrompt(db, user.id)
  // 全期間は最初の記録の日から表示する
  const shownFrom = range === 'all' ? days[0]!.date : from
  const items = await generateNikkiReview(event, { from: shownFrom, to, days, prompt })
  return { from: shownFrom, to, dayCount: days.length, items }
})
