import { initFarmManager } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  await db.prepare('DELETE FROM farm_manager_rules WHERE id = ? AND user_id = ?').bind(id, user.id).run()
  return { ok: true }
})
