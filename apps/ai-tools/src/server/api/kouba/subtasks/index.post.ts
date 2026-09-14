import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask, normalizeHours, nextSubtaskSortOrder } from '~/server/utils/kouba'

// サブタスクを新規作成する。時間は日別に分けず、作成時に +/- で決めた1個の値（30分刻み）をまとめて持つ。
// 並び順（sort_order）は常に末尾に追加する。並べ替えは subtasks/reorder.post.ts の担当。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ taskId?: string; title?: string; hours?: number }>(event)
  const taskId = body?.taskId ?? ''
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })

  const hours = normalizeHours(body?.hours)
  if (hours === null) throw createError({ statusCode: 400, message: '時間は0〜30時間の範囲（30分刻み）で指定してください' })

  const task = await findOwnedTask(db, user.id, taskId)
  if (!task) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const sortOrder = await nextSubtaskSortOrder(db, taskId)
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_subtasks (id, user_id, task_id, title, hours, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, taskId, title, hours, sortOrder)
    .run()

  return { id, taskId, title, hours, createdAt: new Date().toISOString() }
})
