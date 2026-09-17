import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// タスクの削除。サブタスク（kouba_task_subtasks）は板と無関係の独立機能なので、ここでは触らない。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  await db.prepare('DELETE FROM kouba_subtasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
