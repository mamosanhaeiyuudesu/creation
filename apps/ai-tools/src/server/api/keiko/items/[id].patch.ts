import { requireKeikoUser, requireKeikoDb, ensureKeikoTables } from '~/server/utils/keiko'

// 練習項目名の変更・表示/非表示の切り替え。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const id = getRouterParam(event, 'id')!
  const existing = await db.prepare('SELECT id FROM keiko_items WHERE id = ? AND user_id = ?').bind(id, user.id).first<{ id: string }>()
  if (!existing) throw createError({ statusCode: 404, message: '項目が見つかりません' })

  const body = await readBody<{ name?: string; active?: boolean }>(event)

  if (typeof body?.name === 'string') {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, message: '項目名を入力してください' })
    await db.prepare('UPDATE keiko_items SET name = ? WHERE id = ?').bind(name, id).run()
  }

  if (typeof body?.active === 'boolean') {
    await db.prepare('UPDATE keiko_items SET active = ? WHERE id = ?').bind(body.active ? 1 : 0, id).run()
  }

  return { ok: true }
})
