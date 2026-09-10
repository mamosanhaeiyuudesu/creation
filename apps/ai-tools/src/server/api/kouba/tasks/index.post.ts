import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory } from '~/server/utils/kouba'

// タスク（付箋）を新規作成する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryId?: string; title?: string }>(event)
  const categoryId = body?.categoryId ?? ''
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'タスク名を入力してください' })

  const category = await findOwnedCategory(db, user.id, categoryId)
  if (!category) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO kouba_tasks (id, user_id, category_id, title) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, categoryId, title)
    .run()

  return { id, categoryId, title, createdAt: new Date().toISOString(), logs: [], totalHours: 0 }
})
