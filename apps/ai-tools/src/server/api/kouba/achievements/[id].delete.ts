import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedAchievement, deleteAchievement } from '~/server/utils/kouba'

// 達成記録の削除。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedAchievement(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: '達成記録が見つかりません' })

  await deleteAchievement(db, id)
  return { ok: true }
})
