import { requireIpponUser, requireIpponDb, ensureIpponTables } from '~/server/utils/ippon'

// 案件を削除（所有者のみ）。バージョンも合わせて削除。
export default defineEventHandler(async (event) => {
  const user = await requireIpponUser(event)
  const db = requireIpponDb(event)
  await ensureIpponTables(db)
  const id = getRouterParam(event, 'id') || ''

  const row = await db.prepare('SELECT id FROM ippon_projects WHERE id = ? AND user_id = ?').bind(id, user.id).first()
  if (!row) throw createError({ statusCode: 404, message: '案件が見つかりません' })

  await db.prepare('DELETE FROM ippon_versions WHERE project_id = ?').bind(id).run()
  await db.prepare('DELETE FROM ippon_projects WHERE id = ?').bind(id).run()
  return { ok: true }
})
