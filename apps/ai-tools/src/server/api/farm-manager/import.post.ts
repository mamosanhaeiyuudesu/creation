import {
  initFarmManager,
  loadAccounts,
  looseDate,
  newId,
  normalizeCostType,
  parseCsv,
  toNumber,
} from '~/server/utils/farm-manager'
import { CATEGORY_TO_COST_TYPE, PROVISIONAL_VARIABLE } from '~/types/farm-manager'

// 既存Excelからのインポート（仕様§8）。列はヘッダー行の名前で拾うので、並び順が違っても読める。
// 科目が書かれていない/知らない科目なら仮置き（VAR999）に落として取り込む＝取り込みを止めない（§3-3）。
//
// 認識する列名（別名も可）: 発生日(日付/納品日) / 支払日 / 支払方法 / 取引先(仕入先/店名) /
//   品目(商品名/内容) / 数量 / 単価 / 金額(合計) / 科目コード / 科目名 / 区分 / メモ(備考)

const ALIASES: Record<string, string[]> = {
  occurredAt: ['発生日', '日付', '納品日', '取引日', '購入日'],
  paidAt: ['支払日', '決済日'],
  paymentType: ['支払方法', '支払区分'],
  vendorName: ['取引先', '仕入先', '店名', '購入先', '業者'],
  itemName: ['品目', '品名', '商品名', '内容', '摘要'],
  quantity: ['数量', '個数'],
  unitPrice: ['単価'],
  amount: ['金額', '合計', '税込金額', '価格'],
  accountCode: ['科目コード', 'コード'],
  accountName: ['科目名', '科目', '勘定科目', '費目'],
  costType: ['区分', '変動固定'],
  note: ['メモ', '備考'],
}

function buildColumnMap(header: string[]): Record<string, number> {
  const map: Record<string, number> = {}
  header.forEach((raw, i) => {
    const h = raw.trim().replace(/[\s　]/g, '')
    for (const [key, names] of Object.entries(ALIASES)) {
      if (map[key] === undefined && names.some((n) => h === n || h.includes(n))) map[key] = i
    }
  })
  return map
}

export default defineEventHandler(async (event) => {
  const { db, user } = await initFarmManager(event)
  const body = await readBody<{ csv?: string; dryRun?: boolean }>(event)
  const text = body?.csv ?? ''
  if (!text.trim()) throw createError({ statusCode: 400, message: 'CSVの中身が空です' })

  const rows = parseCsv(text)
  if (rows.length < 2) throw createError({ statusCode: 400, message: '見出し行とデータ行のあるCSVを貼り付けてください' })

  const col = buildColumnMap(rows[0]!)
  if (col.amount === undefined) throw createError({ statusCode: 400, message: '「金額」の列が見つかりません。見出し行を確認してください。' })

  const accounts = await loadAccounts(db, user.id)
  const byCode = new Map(accounts.map((a) => [a.code, a]))
  const byName = new Map(accounts.map((a) => [a.name.replace(/[（(].*$/, '').trim(), a]))
  const fallbackYear = Number(new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }).slice(0, 4))
  const todayStr = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })

  const pick = (row: string[], key: string): string => (col[key] === undefined ? '' : (row[col[key]!] ?? '').trim())

  // 同じ「発生日 × 取引先」は1件の取引にまとめる（Excelでは1行1品目で書かれているため）
  const groups = new Map<string, { occurredAt: string; paidAt: string | null; paymentType: 'CASH' | 'CREDIT'; vendorName: string; note: string; items: any[] }>()
  const warnings: string[] = []
  let provisionalCount = 0

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!
    const amount = toNumber(pick(row, 'amount'))
    if (amount === null || amount === 0) continue

    const occurredAt = looseDate(pick(row, 'occurredAt'), fallbackYear) ?? todayStr
    const vendorName = pick(row, 'vendorName')
    const paymentRaw = pick(row, 'paymentType')
    const paymentType = /現金|CASH/i.test(paymentRaw) ? 'CASH' : 'CREDIT'
    const paidAt = looseDate(pick(row, 'paidAt'), fallbackYear)

    const codeRaw = pick(row, 'accountCode').toUpperCase()
    const nameRaw = pick(row, 'accountName').replace(/[（(].*$/, '').trim()
    let account = byCode.get(codeRaw) ?? byName.get(nameRaw)
    if (!account) {
      account = byCode.get(PROVISIONAL_VARIABLE)!
      provisionalCount++
    }
    const costType = normalizeCostType(pick(row, 'costType')) ?? CATEGORY_TO_COST_TYPE[account.category]

    const key = `${occurredAt}|${vendorName}|${paymentType}`
    if (!groups.has(key)) groups.set(key, { occurredAt, paidAt, paymentType, vendorName, note: pick(row, 'note'), items: [] })
    groups.get(key)!.items.push({
      itemName: pick(row, 'itemName') || nameRaw || '（品目不明）',
      quantity: toNumber(pick(row, 'quantity')),
      unitPrice: toNumber(pick(row, 'unitPrice')),
      amount: Math.round(amount),
      accountCode: account.code,
      costType,
      isProvisional: account.isProvisionalBucket,
      // 取り込んだ時点では人が見ていないので、仮置きぶんだけ「要確認」を立てる
      needsConfirmation: account.isProvisionalBucket,
    })
  }

  if (!groups.size) throw createError({ statusCode: 400, message: '取り込める行がありませんでした（金額の入った行が見つかりません）' })
  if (provisionalCount) warnings.push(`${provisionalCount}行は科目が判別できなかったので「その他経費（変動費）」に仮置きしました。仮置き一覧からまとめて振り替えられます。`)

  if (body?.dryRun) {
    return {
      dryRun: true,
      transactions: groups.size,
      items: [...groups.values()].reduce((n, g) => n + g.items.length, 0),
      provisional: provisionalCount,
      warnings,
      preview: [...groups.values()].slice(0, 5),
    }
  }

  // 取引・明細をまとめて1 batch で流す（行数ぶん run すると Workers の subrequest 上限に当たる）
  const txStmt = db.prepare(
    `INSERT INTO farm_manager_transactions (id, user_id, image_url, vendor_name, occurred_at, paid_at, payment_type, note)
     VALUES (?, ?, '', ?, ?, ?, ?, ?)`
  )
  const itemStmt = db.prepare(
    `INSERT INTO farm_manager_items
       (id, transaction_id, user_id, item_name, quantity, unit_price, amount, account_code, cost_type,
        confidence_score, needs_confirmation, is_provisional, confirmed_by_user, worker_id, reason, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, NULL, 'Excel/CSVから取り込み', ?)`
  )

  const statements: any[] = []
  for (const g of groups.values()) {
    const txId = newId()
    statements.push(txStmt.bind(txId, user.id, g.vendorName, g.occurredAt, g.paidAt, g.paymentType, g.note))
    g.items.forEach((item, i) => {
      statements.push(
        itemStmt.bind(
          newId(), txId, user.id, item.itemName, item.quantity, item.unitPrice, item.amount,
          item.accountCode, item.costType,
          item.needsConfirmation ? 1 : 0, item.isProvisional ? 1 : 0, item.isProvisional ? 0 : 1, i
        )
      )
    })
  }
  // D1のbatchは一度に流しすぎると重いので分割する
  const CHUNK = 100
  for (let i = 0; i < statements.length; i += CHUNK) {
    await db.batch(statements.slice(i, i + CHUNK))
  }

  return {
    dryRun: false,
    transactions: groups.size,
    items: statements.length - groups.size,
    provisional: provisionalCount,
    warnings,
  }
})
