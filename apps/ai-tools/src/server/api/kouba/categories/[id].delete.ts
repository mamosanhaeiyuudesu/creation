import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory } from '~/server/utils/kouba'

// カテゴリの削除。配下のタスク・ログもまとめて削除する（3テーブルとも所有者はカテゴリ経由でしか辿れないため個別チェックは不要）。
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
    await db.prepare(`DELETE FROM kouba_logs WHERE task_id IN (${placeholders})`).bind(...taskIds).run()
    await db.prepare('DELETE FROM kouba_tasks WHERE category_id = ?').bind(id).run()
  }
  await db.prepare('DELETE FROM kouba_categories WHERE id = ?').bind(id).run()
  return { ok: true }
})
