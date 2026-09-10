import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask, findOwnedCategory, normalizeIcon, nextTaskSortOrder } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_TASK_ICON } from '~/types/kouba'

// タスクの部分更新（title / icon / categoryId のいずれか1つ以上）。
// categoryId を変えると「別カテゴリへ移動」＝移動先の末尾（sort_orderの最大+1）に置く
// （並び順を指定したい移動＝ドラッグ＆ドロップは reorder.patch.ts の担当）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const body = await readBody<{ title?: string; icon?: string; categoryId?: string }>(event)
  const sets: string[] = []
  const params: unknown[] = []

  if (body?.title !== undefined) {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, message: 'タスク名を入力してください' })
    sets.push('title = ?')
    params.push(title)
  }
  if (body?.icon !== undefined) {
    sets.push('icon = ?')
    params.push(normalizeIcon(body.icon, KOUBA_DEFAULT_TASK_ICON))
  }
  if (body?.categoryId !== undefined && body.categoryId !== existing.categoryId) {
    const destCategory = await findOwnedCategory(db, user.id, body.categoryId)
    if (!destCategory) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })
    const sortOrder = await nextTaskSortOrder(db, body.categoryId)
    sets.push('category_id = ?', 'sort_order = ?')
    params.push(body.categoryId, sortOrder)
  }
  if (!sets.length) throw createError({ statusCode: 400, message: '更新する項目がありません' })

  params.push(id)
  await db.prepare(`UPDATE kouba_tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return { ok: true }
})
