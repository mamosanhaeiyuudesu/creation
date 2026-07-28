import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, deleteReview } from '~/server/utils/guesthouse'

// レビュー・意見を1件削除する（所有者チェック込み）。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const ok = await deleteReview(db, user.id, id)
  if (!ok) throw createError({ statusCode: 404, message: 'レビューが見つかりません' })
  return { ok: true }
})
