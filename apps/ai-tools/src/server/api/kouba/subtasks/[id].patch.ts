import { requireKoubaUser, requireKoubaDb, ensureKoubaTables, findOwnedSubtask } from '~/server/utils/kouba'

// サブタスク名の変更。
export default defineEventHandler(async (event) => {
  const user = await requireKoubaUser(event)
  const db = requireKoubaDb(event)
  await ensureKoubaTables(db)
  const id = getRouterParam(event, 'id')!

  const existing = await findOwnedSubtask(db, user.id, id)
  if (!existing) throw createError({ statusCode: 404, message: 'サブタスクが見つかりません' })

  const body = await readBody<{ title?: string }>(event)
  const title = (body?.title ?? '').trim()
  if (!title) throw createError({ statusCode: 400, message: 'サブタスク名を入力してください' })

  await db.prepare('UPDATE kouba_subtasks SET title = ? WHERE id = ?').bind(title, id).run()
  return { ok: true }
})
