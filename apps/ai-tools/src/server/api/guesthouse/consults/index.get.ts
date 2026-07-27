import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadPendingConsults } from '~/server/utils/guesthouse'

// 阪中さんの受信箱：未対応の相談（handoff）を一覧（所有宿のみ）。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  return await loadPendingConsults(db, user.id)
})
