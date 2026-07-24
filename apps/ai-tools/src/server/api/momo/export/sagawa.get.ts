import { requireMomoUser, requireMomoDb, ensureMomoTables, loadOrders, loadSettings, buildSagawaCsv } from '~/server/utils/momo'

// 佐川急便 e飛伝III 取込CSVを書き出す（宛先は空欄、UTF-8 BOM付き）。
// クエリ: ?date=YYYY-MM-DD（納品日で絞り込み）, ?status=all|confirmed（既定は下書き除外）, ?header=1（確認用ヘッダ付き）
export default defineEventHandler(async (event) => {
  const user = await requireMomoUser(event)
  const db = requireMomoDb(event)
  await ensureMomoTables(db)

  const query = getQuery(event)
  const date = typeof query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.date) ? query.date : null
  const includeAll = query.status === 'all'
  const withHeader = query.header === '1'

  let orders = await loadOrders(db, user.id)
  // 既定では下書きは出力しない（確定/出荷済のみ）。誤発送防止。
  if (!includeAll) orders = orders.filter((o) => o.status !== 'draft')
  if (date) orders = orders.filter((o) => o.deliveryDate === date)

  const settings = await loadSettings(db, user.id)
  const csv = buildSagawaCsv(orders, settings, withHeader)

  const stamp = date ? date.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '')
  setResponseHeaders(event, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="momo_sagawa_${stamp}.csv"`,
  })
  return csv
})
