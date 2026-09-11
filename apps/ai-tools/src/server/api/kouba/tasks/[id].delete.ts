import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// タスクの削除。配下のサブタスクもまとめて削除する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  await db.prepare('DELETE FROM kouba_subtasks WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_tasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
