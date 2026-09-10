import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, normalizeIcon } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_CATEGORY_ICON } from '~/types/kouba'

// カテゴリ名・アイコンの変更（部分更新。name/icon のどちらか一方だけでもよい）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const body = await readBody<{ name?: string; icon?: string }>(event)
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
  if (!sets.length) throw createError({ statusCode: 400, message: '更新する項目がありません' })

  params.push(id)
  await db.prepare(`UPDATE kouba_categories SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return { ok: true }
})
