import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadTips } from '~/server/utils/guesthouse'

// ホスト共通の「旅の情報」（おすすめ素材）を取得。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  return await loadTips(db, user.id)
})
