import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtaskItem, setSubtaskItemDone } from '~/server/utils/kouba'

// サブタスク名の変更、または完了(done)の切り替え。どちらか一方、または両方を同時に送れる部分更新
// （kouba_tasks の focused と同じパターン）。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtaskItem(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  const body = await readBody<{ title?: string; done?: boolean }>(event)

  if (body?.title !== undefined) {
    const title = body.title.trim()
    if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })
    await db.prepare('UPDATE kouba_task_subtasks SET title = ? WHERE id = ?').bind(title, id).run()
  }

  if (body?.done !== undefined) {
    await setSubtaskItemDone(db, id, !!body.done)
  }

  return { ok: true }
})
