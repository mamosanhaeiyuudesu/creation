import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadHouseSummaries } from '~/server/utils/guesthouse'

// ホストの宿一覧（要ログイン・user_id スコープ）。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  return await loadHouseSummaries(db, user.id)
})
