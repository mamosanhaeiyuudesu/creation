import { requireKoubaUser, requireKoubaDb, ensureKoubaTables } from '~/server/utils/kouba'

// 日別作業時間の削除。kouba_subtask_logs は user_id を持たないため kouba_subtasks と join して所有者を確認する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await db
    .prepare('SELECT l.id FROM kouba_subtask_logs l JOIN kouba_subtasks s ON s.id = l.subtask_id WHERE l.id = ? AND s.user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '記録が見つかりません' })

  await db.prepare('DELETE FROM kouba_subtask_logs WHERE id = ?').bind(id).run()
  return { ok: true }
})
