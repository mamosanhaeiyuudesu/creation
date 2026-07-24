import { requireMomoUser, requireMomoDb, ensureMomoTables, loadOrders } from '~/server/utils/momo'

// ログインユーザーの注文一覧を明細・原文込みで返す（納品日昇順、NULLは末尾）。
// 絞り込みはクライアント側で行うため、ここでは全件返す。
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)
  return await loadOrders(db, user.id)
})
