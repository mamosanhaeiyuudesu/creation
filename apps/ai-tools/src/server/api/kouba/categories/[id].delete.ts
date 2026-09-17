import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, compactCategoryPositions } from '~/server/utils/kouba'

// カテゴリの削除。**他のカテゴリにも属しているジョブはそのまま残す**（このカテゴリの表示からだけ外れる）。
// **このカテゴリだけに属していたジョブ**はタスクごと削除する（=どこにも属さない孤立ジョブを作らない）。
// 削除後、後ろのカテゴリを前へ詰める（空いた枠を「カテゴリを追加」のまま残さない）。
// サブタスク（kouba_task_subtasks）は板と無関係の独立機能なので、ここでは触らない。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedCategory(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const linkRows = await db.prepare('SELECT task_id FROM kouba_task_categories WHERE category_id = ?').bind(id).all<{ task_id: string }>()
  const jobIds = (linkRows?.results ?? []).map((r: { task_id: string }) => r.task_id)

  await db.prepare('DELETE FROM kouba_task_categories WHERE category_id = ?').bind(id).run()

  if (jobIds.length) {
    // このカテゴリを外した後も他のカテゴリに残っているジョブは対象外＝孤立した（どこにも属さなくなった）ものだけ削除する
    const placeholders = jobIds.map(() => '?').join(',')
    const remaining = await db
      .prepare(`SELECT DISTINCT task_id FROM kouba_task_categories WHERE task_id IN (${placeholders})`)
      .bind(...jobIds)
      .all<{ task_id: string }>()
    const remainingIds = new Set((remaining?.results ?? []).map((r: { task_id: string }) => r.task_id))
    const orphanJobIds = jobIds.filter((jid: string) => !remainingIds.has(jid))
    if (orphanJobIds.length) {
      const orphanPlaceholders = orphanJobIds.map(() => '?').join(',')
      await db.prepare(`DELETE FROM kouba_subtasks WHERE task_id IN (${orphanPlaceholders})`).bind(...orphanJobIds).run()
      await db.prepare(`DELETE FROM kouba_tasks WHERE id IN (${orphanPlaceholders})`).bind(...orphanJobIds).run()
    }
  }

  await db.prepare('DELETE FROM kouba_categories WHERE id = ?').bind(id).run()
  await compactCategoryPositions(db, user.id)
  return { ok: true }
})
