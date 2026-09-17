import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedJob } from '~/server/utils/kouba'

// ジョブの削除。所属していたカテゴリの数に関わらず、配下のタスクごとまるごと削除する
// （「ジョブを削除」はどのカテゴリ経由で開いても同じ1つのジョブを消す操作。カテゴリからだけ外したいときは
// ジョブ詳細モーダルのカテゴリ選択を外す＝ PATCH の categoryIds を使う）。
// サブタスク（kouba_task_subtasks）は板と無関係の独立機能なので、ここでは触らない。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedJob(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'ジョブが見つかりません' })

  await db.prepare('DELETE FROM kouba_subtasks WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_task_categories WHERE task_id = ?').bind(id).run()
  await db.prepare('DELETE FROM kouba_tasks WHERE id = ?').bind(id).run()
  return { ok: true }
})
