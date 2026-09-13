import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedCategory } from '~/server/utils/kouba'

// ドラッグ&ドロップ用: 指定カテゴリに掲載するタスクの集合と並び順を丸ごと差し替える。
// taskIds は「そのカテゴリに今後表示することになる全タスクID」を新しい並び順どおりに渡す
// （同一カテゴリ内の入れ替えでも、他カテゴリからドラッグしてきて新たに加わる場合でも同じ形）。
// タスクは複数カテゴリに同時掲載できるので、taskIds に含まれなかった「今までこのカテゴリにいたタスク」は
// このカテゴリの表示からだけ外れる（他のカテゴリに属していればそちらは残る。タスク自体の削除はしない）。
//
// **安全策**: 外そうとしたタスクが「このカテゴリにしか属していない」場合は外さない（このカテゴリに残す）。
// クライアント（moveTaskTo）は「移動先へ先に追加してから、移動元を外す」の順で2回このAPIを呼ぶので、
// 正しく動いていれば移動元を外す時点でそのタスクは既に移動先にも属しており孤立しない。この安全策は、
// 呼び出し順が入れ替わる・呼び出しが片方だけ届く等の不整合があっても「タスクを消してしまう」より
// 「余分なカテゴリに残ってしまう」側に倒すための保険（後者はUIから直せるが、前者は起きるとデータが戻らない）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)

  const body = await readBody<{ categoryId?: string; taskIds?: string[] }>(event)
  const categoryId = body?.categoryId ?? ''
  const taskIds = Array.isArray(body?.taskIds) ? body!.taskIds.filter((v) => typeof v === 'string') : []

  const category = await findOwnedCategory(db, user.id, categoryId)
  if (!category) throw createError({ statusCode: 404, message: 'カテゴリが見つかりません' })

  if (taskIds.length) {
    const placeholders = taskIds.map(() => '?').join(',')
    const owned = await db
      .prepare(`SELECT id FROM kouba_tasks WHERE id IN (${placeholders}) AND user_id = ?`)
      .bind(...taskIds, user.id)
      .all<{ id: string }>()
    const ownedIds = new Set((owned?.results ?? []).map((r: { id: string }) => r.id))
    if (ownedIds.size !== taskIds.length) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })
  }

  const currentRows = await db
    .prepare('SELECT task_id FROM kouba_task_categories WHERE category_id = ?')
    .bind(categoryId)
    .all<{ task_id: string }>()
  const currentIds = (currentRows?.results ?? []).map((r: { task_id: string }) => r.task_id)
  const nextIdSet = new Set(taskIds)
  const candidateRemove = currentIds.filter((tid: string) => !nextIdSet.has(tid))

  // 「このカテゴリにしか属していない」ものは安全策で除外する
  let toRemove = candidateRemove
  if (candidateRemove.length) {
    const placeholders = candidateRemove.map(() => '?').join(',')
    const counts = await db
      .prepare(`SELECT task_id, COUNT(*) AS n FROM kouba_task_categories WHERE task_id IN (${placeholders}) GROUP BY task_id`)
      .bind(...candidateRemove)
      .all<{ task_id: string; n: number }>()
    const countByTask = new Map<string, number>((counts?.results ?? []).map((r: { task_id: string; n: number }) => [r.task_id, r.n]))
    toRemove = candidateRemove.filter((tid: string) => (countByTask.get(tid) ?? 0) > 1)
  }

  const writes: any[] = []
  if (toRemove.length) {
    const placeholders = toRemove.map(() => '?').join(',')
    writes.push(
      db.prepare(`DELETE FROM kouba_task_categories WHERE category_id = ? AND task_id IN (${placeholders})`).bind(categoryId, ...toRemove)
    )
  }
  taskIds.forEach((taskId, i) => {
    writes.push(
      db
        .prepare(
          `INSERT INTO kouba_task_categories (task_id, category_id, user_id, sort_order) VALUES (?, ?, ?, ?)
           ON CONFLICT (task_id, category_id) DO UPDATE SET sort_order = excluded.sort_order`
        )
        .bind(taskId, categoryId, user.id, i)
    )
  })
  if (writes.length) await db.batch(writes)
  return { ok: true }
})
