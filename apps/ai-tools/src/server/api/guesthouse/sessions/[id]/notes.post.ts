import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, createHearingNote } from '~/server/utils/guesthouse'
import type { HearingNote } from '~/types/guesthouse'

// 聞き取りメモを1件追加する（対面などで直接聞いた内容。自由記述・1セッションに複数可）。
export default defineEventHandler(async (event): Promise<HearingNote> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const sessionId = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(event, db, user.id, sessionId)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const body = await readBody<{ content: string }>(event)
  const content = String(body?.content ?? '').trim()
  if (!content) throw createError({ statusCode: 400, message: '内容を入力してください' })

  const id = await createHearingNote(event, db, sessionId, detail.houseId, content)
  return { id, sessionId, content, createdAt: '' }
})
