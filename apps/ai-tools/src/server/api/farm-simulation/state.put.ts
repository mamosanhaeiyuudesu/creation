import { initFarmSimulation, saveState } from '~/server/utils/farm-simulation'
import type { SimState } from '~/types/farm-simulation'

// 状態をまるごと上書き保存する。戻る／進むは画面側の履歴で持つので、サーバーは最新だけを持てばよい。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmSimulation(event)
  const body = await readBody<{ state?: SimState }>(event)
  const state = body?.state
  if (!state || !Array.isArray(state.years) || typeof state.assumptions !== 'object' || !Array.isArray(state.strategies)) {
    throw createError({ statusCode: 400, message: '保存するデータの形式が正しくありません' })
  }
  const updatedAt = await saveState(event, db, user.id, state)
  return { updatedAt }
})
