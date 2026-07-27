import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, getOwnedHouse, loadSessionSummaries } from '~/server/utils/guesthouse'

// 宿の会話（滞在セッション）一覧。所有者チェック込み。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const house = await getOwnedHouse(db, user.id, id)
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })
  return await loadSessionSummaries(db, id)
})
