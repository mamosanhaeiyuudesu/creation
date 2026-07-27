import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadHouse } from '~/server/utils/guesthouse'

// 宿を1件取得（所有者チェック込み・案内項目込み）。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''
  const house = await loadHouse(db, { userId: user.id, houseId: id })
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })
  return house
})
