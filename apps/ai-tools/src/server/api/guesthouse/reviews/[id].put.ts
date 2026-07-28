import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, updateReview } from '~/server/utils/guesthouse'
import type { ReviewInput } from '~/types/guesthouse'

// レビュー・意見を1件更新する（所有者チェック込み）。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const body = await readBody<ReviewInput>(event)
  const text = (body?.body ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '本文を入力してください' })

  const ok = await updateReview(event, db, user.id, id, (body?.source ?? '').trim(), text)
  if (!ok) throw createError({ statusCode: 404, message: 'レビューが見つかりません' })
  return { ok: true }
})
