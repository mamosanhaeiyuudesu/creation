import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, createReview } from '~/server/utils/guesthouse'
import type { Review, ReviewInput } from '~/types/guesthouse'

// レビュー・意見を1件追加する。
export default defineEventHandler(async (event): Promise<Review> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<ReviewInput>(event)
  const text = (body?.body ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '本文を入力してください' })
  const source = (body?.source ?? '').trim()

  const id = await createReview(event, db, user.id, source, text)
  return { id, source, body: text, createdAt: '' }
})
