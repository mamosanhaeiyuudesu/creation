import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedTask, normalizeHours } from '~/server/utils/kouba'

// タスクの部分更新（title / hours / done のいずれか1つ以上）。
// done は完了の切り替え（2026-09-20追加）。sort_order も hours も触らない＝完了にしても時間は合計に残り、
// 戻せば元の位置に戻る（表示側が done で「完了済み」へ分けるだけ）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedTask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'タスクが見つかりません' })

  const body = await readBody<{ title?: string; hours?: number; done?: boolean }>(event)
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
  if (body?.done !== undefined) {
    sets.push('done = ?')
    params.push(body.done ? 1 : 0)
  }
  if (!sets.length) throw createError({ statusCode: 400, message: '更新する項目がありません' })

  params.push(id)
  await db.prepare(`UPDATE kouba_subtasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  return { ok: true }
})
