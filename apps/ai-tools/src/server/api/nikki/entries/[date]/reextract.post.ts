import {
  requireNikkiUser,
  requireNikkiDb,
  requireDate,
  loadEntry,
  loadTopics,
  clearTopics,
  addTopics,
} from '~/server/utils/nikki'
import { extractNikkiTopics } from '~/server/utils/nikki-ai'

/**
 * その日のトピックを全文から作り直す（「トピックを作り直す」ボタン）。
 * 手で直したトピック（edited）は残す＝人が書いた言葉をAIの出力で上書きしない。
 * 残したトピックは見出しをAIに渡して重複を避ける。
 */
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const date = requireDate(getRouterParam(event, 'date'))

  const entry = await loadEntry(event, db, user.id, date)
  if (!entry.body) throw createError({ statusCode: 400, message: 'この日の記録がまだありません' })

  await clearTopics(db, user.id, date, true)
  const kept = await loadTopics(event, db, user.id, date)

  const topics = await extractNikkiTopics(event, {
    date,
    text: entry.body,
    existingHeadlines: kept.map((t) => t.headline),
  })
  // entry_id は本文の行から引き直す（clearTopics で消えるのはトピックの行だけ）
  const row = await db.prepare('SELECT id FROM nikki_entries WHERE user_id = ? AND date = ?').bind(user.id, date).first()
  await addTopics(event, db, user.id, date, (row as any)?.id ?? '', topics)

  return { entry: await loadEntry(event, db, user.id, date) }
})
