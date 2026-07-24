import { requireMomoUser, requireMomoDb, ensureMomoTables, loadOrder } from '~/server/utils/momo'

export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)
  const id = getRouterParam(event, 'id')!
  const order = await loadOrder(db, user.id, id)
  if (!order) throw createError({ statusCode: 404, message: '注文が見つかりません' })
  return order
})
