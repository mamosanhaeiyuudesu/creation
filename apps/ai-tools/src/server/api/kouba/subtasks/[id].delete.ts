import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtaskItem } from '~/server/utils/kouba'

// サブタスクの削除。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtaskItem(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  await db.prepare('DELETE FROM kouba_task_subtasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
