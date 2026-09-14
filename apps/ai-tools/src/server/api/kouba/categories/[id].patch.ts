import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, normalizeIcon, normalizeDescription } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_CATEGORY_ICON } from '~/types/kouba'

// カテゴリ名・アイコン・説明の変更（部分更新。いずれか一方だけでもよい）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const body = await readBody<{ name?: string; icon?: string; description?: string }>(event)
  const sets: string[] = []
  const params: unknown[] = []

  if (body?.name !== undefined) {
    const name = body.name.trim()
    if (!name) throw createError({ statusCode: 400, message: 'カテゴリ名を入力してください' })
    sets.push('name = ?')
    params.push(name)
  }
  if (body?.icon !== undefined) {
    sets.push('icon = ?')
    params.push(normalizeIcon(body.icon, KOUBA_DEFAULT_CATEGORY_ICON))
  }
  if (body?.description !== undefined) {
    const description = normalizeDescription(body.description)
    if (description === null) throw createError({ statusCode: 400, message: '説明が長すぎます' })
    sets.push('description = ?')
    params.push(description)
  }
  if (!sets.length) throw createError({ statusCode: 400, message: '更新する項目がありません' })

  params.push(id)
  await db.prepare(`UPDATE kouba_categories SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return { ok: true }
})
