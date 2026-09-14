import { initFarmManager, loadWorkers } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  return await loadWorkers(db, user.id)
})
