import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, saveDiary } from '~/server/utils/guesthouse'
import type { Diary } from '~/types/guesthouse'

// お客さん日記を保存する（自由記述。阪中さんが手入力/AI下書きを確認・修正した内容）。1セッション1件で置換。
export default defineEventHandler(async (event): Promise<Diary> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<{ sessionId: string; content: string }>(event)
  const sessionId = (body?.sessionId ?? '').trim()
  if (!sessionId) throw createError({ statusCode: 400, message: 'セッションが指定されていません' })

  const detail = await loadSessionDetail(event, db, user.id, sessionId)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const content = String(body?.content ?? '').trim()
  return await saveDiary(event, db, sessionId, detail.houseId, detail.guestName, content)
})
