import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedJob } from '~/server/utils/kouba'

// ジョブの削除。所属していたカテゴリの数に関わらず、配下のタスク・サブタスクごとまるごと削除する
// （「ジョブを削除」はどのカテゴリ経由で開いても同じ1つのジョブを消す操作。カテゴリからだけ外したいときは
// ジョブ詳細モーダルのカテゴリ選択を外す＝ PATCH の categoryIds を使う）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedJob(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'ジョブが見つかりません' })

  const taskRows = await db.prepare('SELECT id FROM kouba_subtasks WHERE task_id = ?').bind(id).all<{ id: string }>()
  const taskIds = (taskRows?.results ?? []).map((r: { id: string }) => r.id)
  if (taskIds.length) {
    const placeholders = taskIds.map(() => '?').join(',')
    await db.prepare(`DELETE FROM kouba_task_subtasks WHERE task_id IN (${placeholders})`).bind(...taskIds).run()
  }
  await db.prepare('DELETE FROM kouba_subtasks WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_task_categories WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_tasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
