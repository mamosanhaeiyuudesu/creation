import { initFarmManager, loadAccounts } from '~/server/utils/farm-manager'

// 勘定科目マスタ（このユーザーぶん）。初回アクセス時に仕様§2の全件がシードされる。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  return await loadAccounts(db, user.id)
})
