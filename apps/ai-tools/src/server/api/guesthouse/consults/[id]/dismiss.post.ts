import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, getOwnedConsult, dismissConsult } from '~/server/utils/guesthouse'

// 相談を「対応不要」として受信箱から外す（回答は送らない）。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const consult = await getOwnedConsult(db, user.id, id)
  if (!consult) throw createError({ statusCode: 404, message: '相談が見つかりません' })

  await dismissConsult(db, id)
  return { ok: true }
})
