import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory } from '~/server/utils/kouba'

// カテゴリ名の変更。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const body = await readBody<{ name?: string }>(event)
  const name = (body?.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'カテゴリ名を入力してください' })

  await db.prepare('UPDATE kouba_categories SET name = ? WHERE id = ?').bind(name, id).run()
  return { ok: true }
})
