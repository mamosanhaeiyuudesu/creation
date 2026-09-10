import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtask } from '~/server/utils/kouba'

// サブタスクの削除。配下の日別作業時間もまとめて削除する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  await db.prepare('DELETE FROM kouba_subtask_logs WHERE subtask_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_subtasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
