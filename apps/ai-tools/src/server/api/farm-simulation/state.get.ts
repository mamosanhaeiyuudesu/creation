import { initFarmSimulation, loadState } from '~/server/utils/farm-simulation'

// 実績・前提条件・対応策をまとめて返す。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmSimulation(event)
  return await loadState(event, db, user.id)
})
