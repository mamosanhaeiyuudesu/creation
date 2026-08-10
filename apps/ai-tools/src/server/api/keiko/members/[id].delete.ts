import { requireKeikoUser, requireKeikoDb, ensureKeikoTables } from '~/server/utils/keiko'

// メンバー削除。花丸記録も合わせて削除する。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const id = getRouterParam(event, 'id')!
  const existing = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })

  await db.prepare('DELETE FROM keiko_records WHERE member_id = ?').bind(id).run()
  await db.prepare('DELETE FROM keiko_members WHERE id = ?').bind(id).run()

  return { ok: true }
})
