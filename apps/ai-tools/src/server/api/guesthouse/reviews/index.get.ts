import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadReviews } from '~/server/utils/guesthouse'
import type { Review } from '~/types/guesthouse'

// レビュー・意見の一覧（ホスト共通・user_id スコープ）。body は復号して返す。
export default defineEventHandler(async (event): Promise<Review[]> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  return await loadReviews(event, db, user.id)
})
