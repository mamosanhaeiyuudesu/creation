import { requireMomoUser, requireMomoDb, ensureMomoTables, loadOrders, buildCustomerCsv } from '~/server/utils/momo'

// 今季の顧客名をユニークで出力（Excelの顧客台帳シートの元。お届け先名称がVLOOKUPキー）。UTF-8 BOM付き。
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)

  const orders = await loadOrders(db, user.id)
  const csv = buildCustomerCsv(orders)

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  setResponseHeaders(event, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="momo_customers_${stamp}.csv"`,
  })
  return csv
})
