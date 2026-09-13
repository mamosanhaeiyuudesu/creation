import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, compactCategoryPositions } from '~/server/utils/kouba'

// カテゴリの削除。**他のカテゴリにも属しているタスクはそのまま残す**（このカテゴリの表示からだけ外れる）。
// **このカテゴリだけに属していたタスク**はサブタスクごと削除する（=どこにも属さない孤立タスクを作らない）。
// 削除後、後ろのカテゴリを前へ詰める（空いた枠を「カテゴリを追加」のまま残さない）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const linkRows = await db.prepare('SELECT task_id FROM kouba_task_categories WHERE category_id = ?').bind(id).all<{ task_id: string }>()
  const taskIds = (linkRows?.results ?? []).map((r: { task_id: string }) => r.task_id)

  await db.prepare('DELETE FROM kouba_task_categories WHERE category_id = ?').bind(id).run()

  if (taskIds.length) {
    // このカテゴリを外した後も他のカテゴリに残っているタスクは対象外＝孤立した（どこにも属さなくなった）ものだけ削除する
    const placeholders = taskIds.map(() => '?').join(',')
    const remaining = await db
      .prepare(`SELECT DISTINCT task_id FROM kouba_task_categories WHERE task_id IN (${placeholders})`)
      .bind(...taskIds)
      .all<{ task_id: string }>()
    const remainingIds = new Set((remaining?.results ?? []).map((r: { task_id: string }) => r.task_id))
    const orphanIds = taskIds.filter((tid: string) => !remainingIds.has(tid))
    if (orphanIds.length) {
      const orphanPlaceholders = orphanIds.map(() => '?').join(',')
      await db.prepare(`DELETE FROM kouba_subtasks WHERE task_id IN (${orphanPlaceholders})`).bind(...orphanIds).run()
      await db.prepare(`DELETE FROM kouba_tasks WHERE id IN (${orphanPlaceholders})`).bind(...orphanIds).run()
    }
  }

  await db.prepare('DELETE FROM kouba_categories WHERE id = ?').bind(id).run()
  await compactCategoryPositions(db, user.id)
  return { ok: true }
})
