import { initFarmManager } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  await db.batch([
    db.prepare('DELETE FROM farm_manager_items WHERE transaction_id = ? AND user_id = ?').bind(id, user.id),
    db.prepare('DELETE FROM farm_manager_transactions WHERE id = ? AND user_id = ?').bind(id, user.id),
  ])
  return { ok: true }
})
