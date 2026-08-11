import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, nextSortOrder, shapeKeikoMember } from '~/server/utils/keiko'
import type { KeikoMember } from '~/types/keiko'

// メンバーを1件追加（末尾に追加）。
export default defineEventHandler(async (event): Promise<KeikoMember> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ name?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '名前を入力してください' })

  const id = crypto.randomUUID()
  const sortOrder = await nextSortOrder(db, 'keiko_members', user.id)
  await db.prepare('INSERT INTO keiko_members (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)').bind(id, user.id, name, sortOrder).run()

  return shapeKeikoMember({ id, name, sort_order: sortOrder })
})
