import { initFarmManager, loadTransactions } from '~/server/utils/farm-manager'

// 取引一覧。?month=YYYY-MM でその月の発生ぶんに絞る（画像は重いので一覧では返さない）。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const q = getQuery(event)
  const month = /^\d{4}-\d{2}$/.test(String(q.month ?? '')) ? String(q.month) : undefined
  return await loadTransactions(db, user.id, { month, limit: Number(q.limit) || 200 })
})
