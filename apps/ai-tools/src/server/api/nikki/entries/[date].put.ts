import {
  requireNikkiUser,
  requireNikkiDb,
  requireDate,
  appendEntryBody,
  loadEntry,
  loadTopics,
  addTopics,
} from '~/server/utils/nikki'
import { extractNikkiTopics } from '~/server/utils/nikki-ai'

/**
 * その日の記録に入力を追記し、**追記した分から**トピックを抜き出して足す。
 *
 * 全文から毎回抜き直さないのは、手で直したトピックを消さないため。
 * そのかわり既存の見出しをAIに渡して「同じ出来事は返すな」と伝える（nikki-ai.ts）。
 * 全文から作り直したいときは entries/[date]/reextract を呼ぶ。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const date = requireDate(getRouterParam(event, 'date'))

  const body = await readBody<{ text?: string; extract?: boolean }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '入力が空です' })

  const { entryId, added } = await appendEntryBody(event, db, user.id, date, text)

  // extract=false は「文字起こしを取り込むだけ」＝抽出せず本文だけ足したいとき用
  if (body?.extract !== false) {
    const existing = await loadTopics(event, db, user.id, date)
    const topics = await extractNikkiTopics(event, {
      date,
      text: added,
      existingHeadlines: existing.map((t) => t.headline),
    })
    await addTopics(event, db, user.id, date, entryId, topics)
  }

  return { entry: await loadEntry(event, db, user.id, date) }
})
