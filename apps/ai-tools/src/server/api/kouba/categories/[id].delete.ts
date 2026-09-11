import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, compactCategoryPositions } from '~/server/utils/kouba'

// カテゴリの削除。配下のタスク・サブタスクもまとめて削除し、
// 後ろのカテゴリを前へ詰める（空いた枠を「カテゴリを追加」のまま残さない）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const taskRows = await db.prepare('SELECT id FROM kouba_tasks WHERE category_id = ?').bind(id).all<{ id: string }>()
  const taskIds = (taskRows?.results ?? []).map((r: { id: string }) => r.id)
  if (taskIds.length) {
    const placeholders = taskIds.map(() => '?').join(',')
    await db.prepare(`DELETE FROM kouba_subtasks WHERE task_id IN (${placeholders})`).bind(...taskIds).run()
    await db.prepare('DELETE FROM kouba_tasks WHERE category_id = ?').bind(id).run()
  }
  await db.prepare('DELETE FROM kouba_categories WHERE id = ?').bind(id).run()
  await compactCategoryPositions(db, user.id)
  return { ok: true }
})
