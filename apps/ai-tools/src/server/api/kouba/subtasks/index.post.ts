import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, nextSubtaskSortOrder } from '~/server/utils/kouba'
import type { KoubaSubtask } from '~/types/kouba'

// サブタスクを新規作成する（名前だけ。末尾に追加）。
export default defineEventHandler(async (event): Promise<KoubaSubtask> => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ title?: string }>(event)
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })

  const sortOrder = await nextSubtaskSortOrder(db, user.id)
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  await db
    .prepare('INSERT INTO kouba_task_subtasks (id, user_id, title, sort_order, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.id, title, sortOrder, createdAt)
    .run()

  return { id, title, createdAt }
})
