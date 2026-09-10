import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory, normalizeIcon, nextTaskSortOrder } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_TASK_ICON } from '~/types/kouba'

// タスク（付箋）を新規作成する。カテゴリ内の末尾（sort_orderの最大+1）に追加する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryId?: string; title?: string; icon?: string }>(event)
  const categoryId = body?.categoryId ?? ''
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'タスク名を入力してください' })

  const category = await findOwnedCategory(db, user.id, categoryId)
  if (!category) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const icon = normalizeIcon(body?.icon, KOUBA_DEFAULT_TASK_ICON)
  const sortOrder = await nextTaskSortOrder(db, categoryId)

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_tasks (id, user_id, category_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.id, categoryId, title, icon, sortOrder)
    .run()

  return { id, categoryId, title, icon, createdAt: new Date().toISOString(), logs: [], totalHours: 0 }
})
