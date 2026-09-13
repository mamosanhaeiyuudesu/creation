import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// タスクの削除。所属していたカテゴリの数に関わらず、配下のサブタスクごとまるごと削除する
// （「タスクを削除」はどのカテゴリ経由で開いても同じ1つのタスクを消す操作。カテゴリからだけ外したいときは
// タスク詳細モーダルのカテゴリ選択を外す＝ PATCH の categoryIds を使う）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  await db.prepare('DELETE FROM kouba_subtasks WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_task_categories WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_tasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
