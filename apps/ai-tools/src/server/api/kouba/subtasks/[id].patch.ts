import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtask, normalizeHours, toggleSubtaskDone } from '~/server/utils/kouba'

// サブタスクの部分更新（title / hours / done のいずれか1つ以上）。
// **hours はDONE中は編集できない**（400）＝タスクへ加算した分と食い違うと「DONEを外せば引き戻せる」が
// 崩れるため。時間を直したいときは先に done: false で外してから hours を変える。
// done を渡すと toggleSubtaskDone が紐づくタスクの hours へ増減を反映する（同じ状態への変更は何もしない）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  const body = await readBody<{ title?: string; hours?: number; done?: boolean }>(event)
  if (body?.title === undefined && body?.hours === undefined && body?.done === undefined) {
    throw createError({ statusCode: 400, message: '更新する項目がありません' })
  }

  const sets: string[] = []
  const params: unknown[] = []
  if (body?.title !== undefined) {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })
    sets.push('title = ?')
    params.push(title)
  }
  if (body?.hours !== undefined) {
    if (existing.done) throw createError({ statusCode: 400, message: '完了済みのサブタスクの時間は編集できません。先にDONEを外してください' })
    const hours = normalizeHours(body.hours)
    if (hours === null) throw createError({ statusCode: 400, message: '時間は0〜30時間の範囲（30分刻み）で指定してください' })
    sets.push('hours = ?')
    params.push(hours)
    existing.hours = hours // done切り替えが同じリクエストに含まれた場合、加算にこの新しい値を使う
  }
  if (sets.length) {
    params.push(id)
    await db.prepare(`UPDATE kouba_task_subtasks SET ${sets.join(', ')} WHERE id = ?`).bind(...params).run()
  }

  if (body?.done !== undefined) await toggleSubtaskDone(db, existing, body.done)

  return { ok: true }
})
