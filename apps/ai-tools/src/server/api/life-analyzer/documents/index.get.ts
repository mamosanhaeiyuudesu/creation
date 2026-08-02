import { ensureLifeTables, loadDocumentSummaries, requireLifeDb, requireLifeUser } from '~/server/utils/life-analyzer'

// 履歴一覧（新しい順・本文なし）。
export default defineEventHandler(async (event) => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)
  return await loadDocumentSummaries(event, db, user.id)
})
