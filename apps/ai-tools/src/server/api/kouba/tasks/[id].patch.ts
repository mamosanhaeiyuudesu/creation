import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask, normalizeHours } from '~/server/utils/kouba'

// タスクの部分更新（title / hours のどちらか一方以上）。
// hours は手入力の+/-での更新経路（サブタスクのDONE/未DONEによる増減は toggleSubtaskDone が別に行う）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const body = await readBody<{ title?: string; hours?: number }>(event)
  const sets: string[] = []
  const params: unknown[] = []

  if (body?.title !== undefined) {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, message: 'タスク名を入力してください' })
    sets.push('title = ?')
    params.push(title)
  }
  if (body?.hours !== undefined) {
    const hours = normalizeHours(body.hours)
    if (hours === null) throw createError({ statusCode: 400, message: '時間は0〜30時間の範囲（30分刻み）で指定してください' })
    sets.push('hours = ?')
    params.push(hours)
  }
  if (!sets.length) throw createError({ statusCode: 400, message: '更新する項目がありません' })

  params.push(id)
  await db.prepare(`UPDATE kouba_subtasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return { ok: true }
})
