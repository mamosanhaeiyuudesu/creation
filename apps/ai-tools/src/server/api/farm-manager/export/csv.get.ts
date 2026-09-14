import { buildYearLadder, initFarmManager, loadItemRowsForExport, toCsv } from '~/server/utils/farm-manager'
import { COST_TYPE_LABEL } from '~/types/farm-manager'
import type { CostType, LadderTotals } from '~/types/farm-manager'

// Excelへのエクスポート（仕様§8）。いきなりExcelを捨てさせず、並行運用できるようにするための出口。
//   ?type=items   … 明細を1行ずつ（インポートで読み戻せる列並び）
//   ?type=ladder  … 既存Excelの損益構造そのままの「項目 × 月」表。10カ年計画表の実績列へ貼る用
// GET・Cookie認証なのでブラウザ遷移でそのままダウンロードできる（momoの佐川CSVと同じ作り）。

const LADDER_ROWS: { label: string; pick: (t: LadderTotals) => number }[] = [
  { label: 'A. 売上高計', pick: (t) => t.revenue },
  { label: 'B. 原価計（変動費）', pick: (t) => t.variable },
  { label: 'C. 粗利益', pick: (t) => t.grossProfit },
  { label: 'D. 販管費計（固定費）', pick: (t) => t.fixed },
  { label: 'E. 営業利益', pick: (t) => t.operatingProfit },
  { label: 'F. 雑収入', pick: (t) => t.nonOperatingIncome },
  { label: 'F. 営業外費用', pick: (t) => t.nonOperatingExpense },
  { label: 'G. 経常利益', pick: (t) => t.ordinaryProfit },
  { label: '　うち減価償却費（足し戻し）', pick: (t) => t.depreciation },
  { label: '　増額計（借入金）', pick: (t) => t.financeIn },
  { label: '　減額計（借入金返済）', pick: (t) => t.financeOut },
  { label: 'H. 現金増減額', pick: (t) => t.cashChange },
]

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const q = getQuery(event)
  const type = String(q.type ?? 'items')
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  if (type === 'ladder') {
    const year = Number(q.year) || Number(today.slice(0, 4))
    const months = await buildYearLadder(db, user.id, year)
    const header = ['項目', ...months.map((m) => `${Number(m.month.slice(5))}月`), '年計']
    const rows: unknown[][] = [header]
    for (const def of LADDER_ROWS) {
      const values = months.map((m) => Math.round(def.pick(m.totals)))
      rows.push([def.label, ...values, values.reduce((a, b) => a + b, 0)])
    }
    setHeader(event, 'content-type', 'text/csv; charset=utf-8')
    setHeader(event, 'content-disposition', `attachment; filename="farm-manager-${year}-収支.csv"`)
    return toCsv(rows)
  }

  // 明細。月指定があればその月、無ければ年ぶん。
  const month = /^\d{4}-\d{2}$/.test(String(q.month ?? '')) ? String(q.month) : ''
  const year = Number(q.year) || Number(today.slice(0, 4))
  const from = month ? `${month}-01` : `${year}-01-01`
  const to = month ? `${month}-31` : `${year}-12-31`

  const items = await loadItemRowsForExport(db, user.id, from, to)
  const rows: unknown[][] = [
    ['発生日', '支払日', '支払方法', '取引先', '品目', '数量', '単価', '金額', '科目コード', '科目名', '区分', '従事者', '仮置き', '要確認', '確信度', 'メモ'],
    ...items.map((r: any) => [
      r.occurred_at,
      r.paid_at ?? '',
      r.payment_type === 'CASH' ? '現金' : '掛け',
      r.vendor_name,
      r.item_name,
      r.quantity ?? '',
      r.unit_price ?? '',
      Math.round(r.amount ?? 0),
      r.account_code,
      r.account_name ?? '',
      COST_TYPE_LABEL[(r.cost_type as CostType) ?? 'VARIABLE'] ?? r.cost_type,
      r.worker_name ?? '',
      r.is_provisional ? '仮置き' : '',
      r.needs_confirmation && !r.confirmed_by_user ? '要確認' : '',
      r.confidence_score ?? '',
      r.note ?? '',
    ]),
  ]

  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', `attachment; filename="farm-manager-${month || year}-明細.csv"`)
  return toCsv(rows)
})
