import {
  requireKoubaUser,
  requireKoubaDb,
  ensureKoubaTables,
  findOwnedJob,
  ownedCategoryIds,
  loadJobCategoryIds,
  normalizeIcon,
  normalizeDescription,
  nextJobSortOrder,
} from '~/server/utils/kouba'
import { KOUBA_DEFAULT_JOB_ICON } from '~/types/kouba'

// ジョブの部分更新（title / icon / categoryIds / focused / description のいずれか1つ以上）。
// categoryIds は「このジョブが属することになるカテゴリの集合」を丸ごと差し替える差分更新＝
// 増えたカテゴリには末尾（sort_orderの最大+1）へ追加、外れたカテゴリからは表示ごと外す
// （ジョブ自体やタスクは消さない。今まで属していたカテゴリの並び順はそのまま）。
// 1つも選ばれていない状態は許さない（400）。並び順を指定した移動＝ドラッグ&ドロップは reorder.post.ts の担当。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedJob(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'ジョブが見つかりません' })

  const body = await readBody<{ title?: string; icon?: string; categoryIds?: string[]; focused?: boolean; description?: string }>(event)
  if (
    body?.title === undefined &&
    body?.icon === undefined &&
    body?.categoryIds === undefined &&
    body?.focused === undefined &&
    body?.description === undefined
  ) {
    throw createError({ statusCode: 400, message: '更新する項目がありません' })
  }

  const sets: string[] = []
  const params: unknown[] = []
  if (body?.title !== undefined) {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, message: 'ジョブ名を入力してください' })
    sets.push('title = ?')
    params.push(title)
  }
  if (body?.icon !== undefined) {
    sets.push('icon = ?')
    params.push(normalizeIcon(body.icon, KOUBA_DEFAULT_JOB_ICON))
  }
  if (body?.focused !== undefined) {
    sets.push('focused = ?')
    params.push(body.focused ? 1 : 0)
  }
  if (body?.description !== undefined) {
    const description = normalizeDescription(body.description)
    if (description === null) throw createError({ statusCode: 400, message: '説明が長すぎます' })
    sets.push('description = ?')
    params.push(description)
  }
  if (sets.length) {
    params.push(id)
    await db.prepare(`UPDATE kouba_tasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  }

  if (body?.categoryIds !== undefined) {
    const nextIds = [...new Set(body.categoryIds.filter((v) => typeof v === 'string'))]
    if (!nextIds.length) throw createError({ statusCode: 400, message: 'カテゴリを1つ以上選んでください' })
    const owned = await ownedCategoryIds(db, user.id, nextIds)
    if (owned.size !== nextIds.length) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

    const currentIds = await loadJobCategoryIds(db, id)
    const currentSet = new Set(currentIds)
    const nextSet = new Set(nextIds)
    const toRemove = currentIds.filter((cid) => !nextSet.has(cid))
    const toAdd = nextIds.filter((cid) => !currentSet.has(cid))

    if (toRemove.length) {
      const placeholders = toRemove.map(() => '?').join(',')
      await db
        .prepare(`DELETE FROM kouba_task_categories WHERE task_id = ? AND category_id IN (${placeholders})`)
        .bind(id, ...toRemove)
        .run()
    }
    for (const categoryId of toAdd) {
      const sortOrder = await nextJobSortOrder(db, categoryId)
      await db
        .prepare('INSERT INTO kouba_task_categories (task_id, category_id, user_id, sort_order) VALUES (?, ?, ?, ?)')
        .bind(id, categoryId, user.id, sortOrder)
        .run()
    }
  }

  return { ok: true }
})
