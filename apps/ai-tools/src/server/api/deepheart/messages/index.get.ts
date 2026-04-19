import { getDeepheartDb, requireDeepheartUser } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const query = getQuery(event)
  const limit = Math.min(Math.max(parseInt(String(query.limit ?? '200'), 10) || 200, 1), 500)

  const res = await db
    .prepare('SELECT id, role, content, created_at FROM deepheart_messages WHERE user_id = ? ORDER BY created_at ASC, id ASC LIMIT ?')
    .bind(user.id, limit)
    .all<{ id: string; role: string; content: string; created_at: string }>()

  const rows = res.results ?? []
  return rows.map((r) => ({
    id: r.id,
    role: r.role,
    content: r.content,
    createdAt: r.created_at,
  }))
})
