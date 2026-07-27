import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadRecentSessions } from '~/server/utils/guesthouse'

// 管理トップ用：全宿横断の最近の会話（所有宿のみ）。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  return await loadRecentSessions(db, user.id, 20)
})
