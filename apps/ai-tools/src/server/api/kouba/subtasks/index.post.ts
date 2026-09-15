import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask, normalizeHours, nextSubtaskSortOrder } from '~/server/utils/kouba'

// サブタスクを新規作成する（"今のテーマ"の下の一覧のポップアップから）。
// **どのタスクに紐付けるかは任意**＝taskId を渡さなければ、どのタスクにも属さないメモとして書き留められる
// （その場合はDONEにしても加算先が無いので記録だけになる）。渡すときは本人所有のタスクであることを確認する。
// 作成時点では未DONE（時間はまだタスクへ加算されない）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ taskId?: string | null; title?: string; hours?: number }>(event)
  const taskId = typeof body?.taskId === 'string' && body.taskId ? body.taskId : null
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })

  const hours = normalizeHours(body?.hours)
  if (hours === null) throw createError({ statusCode: 400, message: '時間は0〜30時間の範囲（30分刻み）で指定してください' })

  let sortOrder = 0
  if (taskId) {
    const task = await findOwnedTask(db, user.id, taskId)
    if (!task) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })
    sortOrder = await nextSubtaskSortOrder(db, taskId)
  }

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_task_subtasks (id, user_id, task_id, title, hours, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, taskId, title, hours, sortOrder)
    .run()

  return { id, taskId, title, hours, done: false, doneAt: null, createdAt: new Date().toISOString() }
})
