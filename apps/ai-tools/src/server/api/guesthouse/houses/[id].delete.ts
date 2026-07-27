import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables } from '~/server/utils/guesthouse'

// 宿を削除（案内項目もあわせて削除）。所有者チェック込み。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const existing = await db
    .prepare('SELECT id FROM guesthouse_houses WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  await db.prepare('DELETE FROM guesthouse_facts WHERE house_id = ?').bind(id).run()
  await db.prepare('DELETE FROM guesthouse_houses WHERE id = ?').bind(id).run()
  return { ok: true }
})
