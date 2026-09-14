import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, loadAchievements } from '~/server/utils/kouba'

// 達成したことの一覧（達成日の新しい順）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  return await loadAchievements(db, user.id)
})
