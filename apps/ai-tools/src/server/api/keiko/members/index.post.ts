import { requireKeikoUser, requireKeikoDb, ensureKeikoTables, nextMemberSortOrder, seedDefaultItemsForMember, loadItems, shapeKeikoMember } from '~/server/utils/keiko'
import type { KeikoItem, KeikoMember } from '~/types/keiko'

// メンバーを1件追加（末尾に追加）。初期の練習項目も一緒に用意して返す。
export default defineEventHandler(async (event): Promise<{ member: KeikoMember; items: KeikoItem[] }> => {
  const user = await requireKeikoUser(event)
  const db = requireKeikoDb(event)
  await ensureKeikoTables(db)

  const body = await readBody<{ name?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: '名前を入力してください' })

  const id = crypto.randomUUID()
  const sortOrder = await nextMemberSortOrder(db, user.id)
  await db.prepare('INSERT INTO keiko_members (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)').bind(id, user.id, name, sortOrder).run()
  await seedDefaultItemsForMember(db, user.id, id)

  const items = (await loadItems(db, user.id)).filter((it) => it.memberId === id)

  return { member: shapeKeikoMember({ id, name, sort_order: sortOrder }), items }
})
