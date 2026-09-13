import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, ownedCategoryIds, normalizeIcon, nextTaskSortOrder } from '~/server/utils/kouba'
import { KOUBA_DEFAULT_TASK_ICON } from '~/types/kouba'

// タスク（付箋）を新規作成する。1つ以上のカテゴリに同時掲載できる（categoryIds）＝
// 作成時は「＋」を押したその1カテゴリだけを渡す運用で、複数掲載は後からタスク詳細モーダルで設定する。
// 各カテゴリ内では、そのカテゴリの末尾（sort_orderの最大+1）に追加する。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryIds?: string[]; title?: string; icon?: string }>(event)
  const categoryIds = Array.isArray(body?.categoryIds) ? [...new Set(body!.categoryIds.filter((v) => typeof v === 'string'))] : []
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'タスク名を入力してください' })
  if (!categoryIds.length) throw createError({ statusCode: 400, message: 'カテゴリを1つ以上選んでください' })

  const owned = await ownedCategoryIds(db, user.id, categoryIds)
  if (owned.size !== categoryIds.length) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  const icon = normalizeIcon(body?.icon, KOUBA_DEFAULT_TASK_ICON)
  const id = crypto.randomUUID()

  // kouba_tasks.category_id/sort_order は旧・単一カテゴリ時代の名残の列（NOT NULL制約を満たすためだけに埋める）。
  // 実際の所属・並び順は kouba_task_categories を見る。
  await db
    .prepare('INSERT INTO kouba_tasks (id, user_id, category_id, title, icon, sort_order) VALUES (?, ?, ?, ?, ?, 0)')
    .bind(id, user.id, categoryIds[0], title, icon)
    .run()

  const links = []
  for (const categoryId of categoryIds) {
    const sortOrder = await nextTaskSortOrder(db, categoryId)
    links.push(
      db
        .prepare('INSERT INTO kouba_task_categories (task_id, category_id, user_id, sort_order) VALUES (?, ?, ?, ?)')
        .bind(id, categoryId, user.id, sortOrder)
    )
  }
  await db.batch(links)

  return { id, categoryIds, title, icon, createdAt: new Date().toISOString(), subtasks: [], totalHours: 0 }
})
