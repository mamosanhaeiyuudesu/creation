import { initFarmManager, loadSettings } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  return await loadSettings(db, user.id)
})
