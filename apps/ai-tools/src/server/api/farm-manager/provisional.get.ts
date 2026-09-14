import { initFarmManager, loadAccounts, shapeItem } from '~/server/utils/farm-manager'

// 仮置き一覧（仕様§6-3・実装優先度3）。
// 「その他経費に仮置きされた明細」と「要確認のまま確定していない明細」をまとめて拾う。
// ここが「分類を確定しないと保存できない」設計にしないための受け皿になる。
export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const q = getQuery(event)
  const month = /^\d{4}-\d{2}$/.test(String(q.month ?? '')) ? String(q.month) : ''

  const where = ['i.user_id = ?', '(i.is_provisional = 1 OR (i.needs_confirmation = 1 AND i.confirmed_by_user = 0))']
  const binds: any[] = [user.id]
  if (month) {
    where.push("substr(t.occurred_at, 1, 7) = ?")
    binds.push(month)
  }

  const rows = await db
    .prepare(
      `SELECT i.*, t.vendor_name AS vendor_name, t.occurred_at AS occurred_at
       FROM farm_manager_items i
       JOIN farm_manager_transactions t ON t.id = i.transaction_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.occurred_at DESC, i.sort_order ASC
       LIMIT 300`
    )
    .bind(...binds)
    .all<any>()

  const accounts = await loadAccounts(db, user.id)
  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]))

  return (rows?.results ?? []).map((r: any) => ({
    ...shapeItem(r),
    transactionId: r.transaction_id,
    vendorName: r.vendor_name,
    occurredAt: r.occurred_at,
    accountName: nameByCode.get(r.account_code) ?? r.account_code,
  }))
})
