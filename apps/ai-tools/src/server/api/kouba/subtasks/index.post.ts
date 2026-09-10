import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask } from '~/server/utils/kouba'

// サブタスクを新規作成する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ taskId?: string; title?: string }>(event)
  const taskId = body?.taskId ?? ''
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })

  const task = await findOwnedTask(db, user.id, taskId)
  if (!task) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_subtasks (id, user_id, task_id, title) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, taskId, title)
    .run()

  return { id, taskId, title, createdAt: new Date().toISOString(), logs: [], totalHours: 0 }
})
