import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, isValidDate } from '~/server/utils/keiko'

// 花丸のトグル。既にあれば取り消し、無ければ付ける。
export default defineEventHandler(async (event): Promise<{ done: boolean }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ memberId?: string; itemId?: string; date?: string }>(event)
  const memberId = body?.memberId
  const itemId = body?.itemId
  const date = body?.date
  if (!memberId || !itemId || !isValidDate(date)) {
    throw createError({ statusCode: 400, message: 'memberId・itemId・date (YYYY-MM-DD) が必要です' })
  }

  const member = await db.prepare('SELECT id FROM keiko_members WHERE id = ? AND user_id = ?').bind(memberId, user.id).first<{ id: string }>()
  if (!member) throw createError({ statusCode: 404, message: 'メンバーが見つかりません' })
  const item = await db.prepare('SELECT id FROM keiko_items WHERE id = ? AND user_id = ?').bind(itemId, user.id).first<{ id: string }>()
  if (!item) throw createError({ statusCode: 404, message: '項目が見つかりません' })

  const existing = await db
    .prepare('SELECT id FROM keiko_records WHERE member_id = ? AND item_id = ? AND date = ?')
    .bind(memberId, itemId, date)
    .first<{ id: string }>()

  if (existing) {
    await db.prepare('DELETE FROM keiko_records WHERE id = ?').bind(existing.id).run()
    return { done: false }
  }

  await db
    .prepare('INSERT INTO keiko_records (id, user_id, member_id, item_id, date) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), user.id, memberId, itemId, date)
    .run()
  return { done: true }
})
