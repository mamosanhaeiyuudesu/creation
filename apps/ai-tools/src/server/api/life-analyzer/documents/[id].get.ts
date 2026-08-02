import { ensureLifeTables, loadDocument, requireLifeDb, requireLifeUser } from '~/server/utils/life-analyzer'

// 本文つきで1件取得（履歴からの原文表示用）。
export default defineEventHandler(async (event) => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)

  const id = getRouterParam(event, 'id') ?? ''
  const doc = await loadDocument(event, db, user.id, id)
  if (!doc) throw createError({ statusCode: 404, message: 'テキストが見つかりません' })
  return doc
})
