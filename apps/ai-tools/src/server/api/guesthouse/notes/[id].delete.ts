import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, deleteHearingNote } from '~/server/utils/guesthouse'

// 聞き取りメモを1件削除する（所有者チェック込み）。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const ok = await deleteHearingNote(db, user.id, id)
  if (!ok) throw createError({ statusCode: 404, message: 'メモが見つかりません' })
  return { ok: true }
})
