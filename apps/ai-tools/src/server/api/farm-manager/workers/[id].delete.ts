import { initFarmManager, loadWorkers } from '~/server/utils/farm-manager'

// 従事者を消しても、過去の明細の worker_id はそのまま残す（過去の集計を書き換えないため）。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  await db.prepare('DELETE FROM farm_manager_workers WHERE id = ? AND user_id = ?').bind(id, user.id).run()
  return await loadWorkers(db, user.id)
})
