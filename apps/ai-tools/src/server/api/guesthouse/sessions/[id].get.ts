import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail } from '~/server/utils/guesthouse'

// ホストが会話の全文を読む（所有宿のセッションのみ）。日記があれば同梱。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(event, db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })
  return detail
})
