import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, saveDiary } from '~/server/utils/guesthouse'
import type { Diary, DiaryContent } from '~/types/guesthouse'

// お客さん日記を保存する（阪中さんが確認・修正した内容）。1セッション1件で置換。
export default defineEventHandler(async (event): Promise<Diary> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<{ sessionId: string; content: DiaryContent }>(event)
  const sessionId = (body?.sessionId ?? '').trim()
  if (!sessionId) throw createError({ statusCode: 400, message: 'セッションが指定されていません' })

  const detail = await loadSessionDetail(event, db, user.id, sessionId)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const c = body?.content ?? ({} as DiaryContent)
  const content: DiaryContent = {
    nationality: String(c?.nationality ?? '').trim(),
    itinerary: String(c?.itinerary ?? '').trim(),
    highlights: String(c?.highlights ?? '').trim(),
    notes: String(c?.notes ?? '').trim(),
  }
  return await saveDiary(event, db, sessionId, detail.houseId, detail.guestName, content)
})
