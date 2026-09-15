import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtask, deleteSubtask } from '~/server/utils/kouba'

// サブタスクの削除。DONE中なら削除前に自動でタスクの時間を引き戻す（deleteSubtask に集約）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  await deleteSubtask(db, existing)
  return { ok: true }
})
