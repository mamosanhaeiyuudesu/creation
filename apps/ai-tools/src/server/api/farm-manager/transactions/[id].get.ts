import { initFarmManager, loadTransaction } from '~/server/utils/farm-manager'

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const id = getRouterParam(event, 'id') ?? ''
  const tx = await loadTransaction(db, user.id, id)
  if (!tx) throw createError({ statusCode: 404, message: '取引が見つかりません' })
  return tx
})
