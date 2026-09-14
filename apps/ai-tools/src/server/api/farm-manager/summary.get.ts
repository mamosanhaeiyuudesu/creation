import { buildMonthlySummary, initFarmManager } from '~/server/utils/farm-manager'

// 月次サマリー（仕様§6-2）。month は YYYY-MM。省略時はJSTの当月。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const q = getQuery(event)
  const raw = String(q.month ?? '')
  const month = /^\d{4}-\d{2}$/.test(raw) ? raw : new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 7)
  return await buildMonthlySummary(db, user.id, month)
})
