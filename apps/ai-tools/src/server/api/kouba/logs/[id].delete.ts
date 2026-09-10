import { requireKoubaUser, requireKoubaDb, ensureKoubaTables } from '~/server/utils/kouba'

// 作業ログの削除。kouba_logs は user_id を持たないため kouba_tasks と join して所有者を確認する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await db
    .prepare('SELECT l.id FROM kouba_logs l JOIN kouba_tasks t ON t.id = l.task_id WHERE l.id = ? AND t.user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '記録が見つかりません' })

  await db.prepare('DELETE FROM kouba_logs WHERE id = ?').bind(id).run()
  return { ok: true }
})
