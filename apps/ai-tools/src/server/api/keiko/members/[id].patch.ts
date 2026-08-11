import { requireKeikoUser, requireKeikoDb, ensureKeikoTables } from '~/server/utils/keiko'

// メンバー名の変更。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const id = getRouterParam(event, 'id')!
  const body = await readBody<{ name?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '名前を入力してください' })

  const existing = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })

  await db.prepare('UPDATE keiko_members SET name = ? WHERE id = ?').bind(name, id).run()

  return { ok: true }
})
