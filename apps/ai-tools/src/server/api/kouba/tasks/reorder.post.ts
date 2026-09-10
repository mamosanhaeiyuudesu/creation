import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: 指定カテゴリの並び順を丸ごと差し替える。
// taskIds はそのカテゴリに属することになる全タスクIDを、新しい並び順どおりに渡す
// （同一カテゴリ内の入れ替えでも、他カテゴリからの移動でも同じ形＝移動先の最終形をそのまま送ってもらう）。
// category_id もあわせて更新するので、他カテゴリのタスクをここに含めれば移動を兼ねる。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryId?: string; taskIds?: string[] }>(event)
  const categoryId = body?.categoryId ?? ''
  const taskIds = Array.isArray(body?.taskIds) ? body!.taskIds.filter((v) => typeof v === 'string') : []

  const category = await findOwnedCategory(db, user.id, categoryId)
  if (!category) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })
  if (!taskIds.length) return { ok: true }

  const placeholders = taskIds.map(() => '?').join(',')
  const owned = await db
    .prepare(`SELECT id FROM kouba_tasks WHERE id IN (${placeholders}) AND user_id = ?`)
    .bind(...taskIds, user.id)
    .all<{ id: string }>()
  const ownedIds = new Set((owned?.results ?? []).map((r: { id: string }) => r.id))
  if (ownedIds.size !== taskIds.length) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  for (let i = 0; i < taskIds.length; i++) {
    await db.prepare('UPDATE kouba_tasks SET category_id = ?, sort_order = ? WHERE id = ?').bind(categoryId, i, taskIds[i]).run()
  }
  return { ok: true }
})
