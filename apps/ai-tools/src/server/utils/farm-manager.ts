// 農家向け 経費・経営管理アプリ (farm-manager) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、取引・科目・従事者は user_id でスコープする。
//
// 集計は必ず occurred_at（発生日＝納品日）で行う＝発生主義（仕様§4-2）。
// 農家の取引は掛け払い（ツケ）が主流で、支払日ベースで集計すると経営の実態とずれるため。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import {
  ACCOUNT_SEED,
  CATEGORY_TO_COST_TYPE,
  CONFIDENCE_THRESHOLD,
  PROVISIONAL_FIXED,
  PROVISIONAL_VARIABLE,
} from '~/types/farm-manager'
import type {
  AccountCategory,
  AccountMaster,
  AccountRule,
  CostType,
  ExtractedItem,
  FarmSettings,
  LadderTotals,
  MonthlySummary,
  PaymentType,
  Transaction,
  TransactionItem,
  Worker,
} from '~/types/farm-manager'

export interface FarmManagerUser {
  id: string
  username: string
}

/**
 * farm-manager 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱い、複数行の CREATE TABLE を渡すと "incomplete input" で
 * 静かに失敗する。kouba.ts / kikigaki.ts と同様に prepare().run() を1文ずつ実行する。
 */
export async function ensureFarmManagerTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS farm_manager_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT 'B_VARIABLE',
      is_depreciation INTEGER NOT NULL DEFAULT 0,
      is_provisional_bucket INTEGER NOT NULL DEFAULT 0,
      split_risk INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      is_custom INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_manager_accounts_code ON farm_manager_accounts(user_id, code)`,
    `CREATE TABLE IF NOT EXISTS farm_manager_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      vendor_name TEXT NOT NULL DEFAULT '',
      occurred_at TEXT NOT NULL DEFAULT '',
      paid_at TEXT,
      payment_type TEXT NOT NULL DEFAULT 'CREDIT',
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_farm_manager_tx_user ON farm_manager_transactions(user_id, occurred_at DESC)`,
    `CREATE TABLE IF NOT EXISTS farm_manager_items (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      item_name TEXT NOT NULL DEFAULT '',
      quantity REAL,
      unit_price REAL,
      amount REAL NOT NULL DEFAULT 0,
      account_code TEXT NOT NULL DEFAULT '${PROVISIONAL_VARIABLE}',
      cost_type TEXT NOT NULL DEFAULT 'VARIABLE',
      confidence_score REAL NOT NULL DEFAULT 0,
      needs_confirmation INTEGER NOT NULL DEFAULT 0,
      is_provisional INTEGER NOT NULL DEFAULT 0,
      confirmed_by_user INTEGER NOT NULL DEFAULT 0,
      worker_id TEXT,
      reason TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_farm_manager_items_tx ON farm_manager_items(transaction_id, sort_order)`,
    `CREATE INDEX IF NOT EXISTS idx_farm_manager_items_user ON farm_manager_items(user_id, account_code)`,
    `CREATE TABLE IF NOT EXISTS farm_manager_workers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL DEFAULT '',
      employment_type TEXT NOT NULL DEFAULT 'FAMILY',
      monthly_cost REAL NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_farm_manager_workers_user ON farm_manager_workers(user_id)`,
    `CREATE TABLE IF NOT EXISTS farm_manager_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      vendor_name_pattern TEXT NOT NULL DEFAULT '',
      item_name_pattern TEXT NOT NULL DEFAULT '',
      account_code TEXT NOT NULL DEFAULT '',
      cost_type TEXT NOT NULL DEFAULT 'VARIABLE',
      hit_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_manager_rules_key ON farm_manager_rules(user_id, vendor_name_pattern, item_name_pattern)`,
    `CREATE TABLE IF NOT EXISTS farm_manager_settings (
      user_id TEXT PRIMARY KEY,
      farm_name TEXT NOT NULL DEFAULT '',
      cultivated_area_a REAL NOT NULL DEFAULT 0,
      opening_cash REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ]
  for (const sql of statements) {
    await db.prepare(sql).run()
  }
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireFarmManagerUser(event: any): Promise<FarmManagerUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireFarmManagerDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/** ログイン確認・テーブル用意・科目マスタのシードまでを1回で行う（各APIの入口）。 */
export async function initFarmManager(event: any): Promise<{ db: any; user: FarmManagerUser }> {
  const user = await requireFarmManagerUser(event)
  const db = requireFarmManagerDb(event)
  await ensureFarmManagerTables(db)
  await seedAccounts(db, user.id)
  return { db, user }
}

export function newId(): string {
  return crypto.randomUUID()
}

// ── 勘定科目マスタ ──────────────────────────────

interface AccountRow {
  code: string
  name: string
  category: string
  is_depreciation: number
  is_provisional_bucket: number
  split_risk: number
  note: string
  is_custom: number
  sort_order: number
}

function shapeAccount(row: AccountRow): AccountMaster {
  return {
    code: row.code,
    name: row.name,
    category: row.category as AccountCategory,
    isDepreciation: !!row.is_depreciation,
    isProvisionalBucket: !!row.is_provisional_bucket,
    splitRisk: !!row.split_risk,
    note: row.note,
    isCustom: !!row.is_custom,
    sortOrder: row.sort_order,
  }
}

/**
 * 初回アクセス時に勘定科目マスタ（仕様§2）をこのユーザーへシードする。
 * 既にある科目は上書きしない（ユーザーが名前や区分を直しているかもしれないため INSERT OR IGNORE）。
 */
export async function seedAccounts(db: any, userId: string): Promise<void> {
  const existing = await db
    .prepare('SELECT COUNT(*) AS n FROM farm_manager_accounts WHERE user_id = ?')
    .bind(userId)
    .first<{ n: number }>()
  if ((existing?.n ?? 0) >= ACCOUNT_SEED.length) return

  const stmt = db.prepare(
    `INSERT OR IGNORE INTO farm_manager_accounts
       (id, user_id, code, name, category, is_depreciation, is_provisional_bucket, split_risk, note, is_custom, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`
  )
  // D1 の batch は 1 subrequest で済む（1件ずつ run すると科目数ぶんの subrequest を使い切る）。
  await db.batch(
    ACCOUNT_SEED.map((a) =>
      stmt.bind(
        newId(),
        userId,
        a.code,
        a.name,
        a.category,
        a.isDepreciation ? 1 : 0,
        a.isProvisionalBucket ? 1 : 0,
        a.splitRisk ? 1 : 0,
        a.note,
        a.sortOrder ?? 0
      )
    )
  )
}

export async function loadAccounts(db: any, userId: string): Promise<AccountMaster[]> {
  const rows = await db
    .prepare('SELECT * FROM farm_manager_accounts WHERE user_id = ? AND active = 1 ORDER BY sort_order ASC, code ASC')
    .bind(userId)
    .all<AccountRow>()
  return (rows?.results ?? []).map(shapeAccount)
}

/** 科目コード → マスタ の索引。AIの返り値の検証に使う。 */
export function accountIndex(accounts: AccountMaster[]): Map<string, AccountMaster> {
  return new Map(accounts.map((a) => [a.code, a]))
}

// ── 仕訳（分類）ロジック ──────────────────────────────

/** 学習ルールを取引先で引く（仕様§3-4）。 */
export async function loadRules(db: any, userId: string): Promise<AccountRule[]> {
  const rows = await db
    .prepare('SELECT * FROM farm_manager_rules WHERE user_id = ? ORDER BY hit_count DESC, updated_at DESC')
    .bind(userId)
    .all<any>()
  return (rows?.results ?? []).map((r: any) => ({
    id: r.id,
    vendorNamePattern: r.vendor_name_pattern,
    itemNamePattern: r.item_name_pattern,
    accountCode: r.account_code,
    costType: r.cost_type as CostType,
    hitCount: r.hit_count,
    updatedAt: r.updated_at,
  }))
}

function norm(s: string): string {
  return (s ?? '').trim().toLowerCase().replace(/[\s　]+/g, '')
}

/** 「取引先 × 品目」がルールに当たるか。部分一致（どちらかが空なら、その軸は無条件一致とみなす）。 */
export function matchRule(rules: AccountRule[], vendorName: string, itemName: string): AccountRule | null {
  const v = norm(vendorName)
  const it = norm(itemName)
  for (const rule of rules) {
    const rv = norm(rule.vendorNamePattern)
    const ri = norm(rule.itemNamePattern)
    const vendorOk = !rv || (!!v && (v.includes(rv) || rv.includes(v)))
    const itemOk = !ri || (!!it && (it.includes(ri) || ri.includes(it)))
    if (vendorOk && itemOk) return rule
  }
  return null
}

/** 変動費側の仮置き科目か固定費側の仮置き科目か。判断がつかないものは変動費側に置く（畑の経費が大半のため）。 */
function provisionalCodeFor(costType: CostType): string {
  return costType === 'FIXED' ? PROVISIONAL_FIXED : PROVISIONAL_VARIABLE
}

/**
 * AIの抽出結果を、マスタと学習ルールに照らして確定させる（仕様§4-1 の 3〜5）。
 *   1. 学習ルールに一致すれば最優先で適用する
 *   2. 定義済みコード以外を返してきたら仮置き科目へ落とす
 *   3. 確信度が閾値未満、または判定が割れる科目（§3-2）は「要確認」にする
 * ⚠ ここで保存を止めてはいけない。分類が決まらなくても仮置きして先に進めるのが仕様§3-3。
 */
export function classifyItems(
  rawItems: any[],
  vendorName: string,
  accounts: AccountMaster[],
  rules: AccountRule[]
): ExtractedItem[] {
  const index = accountIndex(accounts)

  return (rawItems ?? []).map((raw) => {
    const itemName = String(raw?.item_name ?? '').trim() || '（品目不明）'
    const amount = toNumber(raw?.amount) ?? 0
    const aiCode = String(raw?.account_code ?? '').trim().toUpperCase()
    const aiConfidence = clamp01(toNumber(raw?.confidence) ?? 0)
    let reason = String(raw?.reason ?? '').trim()

    const rule = matchRule(rules, vendorName, itemName)
    let account = rule ? index.get(rule.accountCode) : index.get(aiCode)
    let confidence = rule ? 1 : aiConfidence
    let matchedRule = !!rule && !!account

    if (rule && !account) {
      // ルールが指す科目をユーザーが消していた場合はルールを無視してAIの判定へ戻す
      account = index.get(aiCode)
      confidence = aiConfidence
      matchedRule = false
    }
    if (matchedRule) {
      reason = `学習ルール「${rule!.vendorNamePattern || 'すべての取引先'} × ${rule!.itemNamePattern || 'すべての品目'}」を適用`
    }

    // 定義済みコード以外（AIの創作・空）は仮置きへ
    if (!account) {
      const guessedType = normalizeCostType(raw?.cost_type) ?? 'VARIABLE'
      const code = provisionalCodeFor(guessedType)
      account = index.get(code)!
      confidence = Math.min(confidence, 0.3)
      if (!reason) reason = 'AIが科目を決められなかったため仮置き'
    }

    const costType = matchedRule ? rule!.costType : CATEGORY_TO_COST_TYPE[account.category]
    const isProvisional = account.isProvisionalBucket
    // 判定が割れる科目（修繕費・燃料費・水道光熱費・資材費など）は確信度が高くても人に確認させる
    const needsConfirmation = !matchedRule && (confidence < CONFIDENCE_THRESHOLD || account.splitRisk || isProvisional)

    return {
      item_name: itemName,
      quantity: toNumber(raw?.quantity),
      unit_price: toNumber(raw?.unit_price),
      amount,
      account_code: account.code,
      cost_type: costType,
      confidence: Number(confidence.toFixed(2)),
      reason,
      needs_confirmation: needsConfirmation,
      is_provisional: isProvisional,
      matched_rule: matchedRule,
    }
  })
}

export function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[,\s¥円]/g, ''))
  return Number.isFinite(n) ? n : null
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

export function normalizeCostType(v: unknown): CostType | null {
  const s = String(v ?? '').trim().toUpperCase()
  return (['REVENUE', 'VARIABLE', 'FIXED', 'NON_OPERATING', 'FINANCE'] as string[]).includes(s) ? (s as CostType) : null
}

export function normalizePaymentType(v: unknown): PaymentType {
  return String(v ?? '').trim().toUpperCase() === 'CASH' ? 'CASH' : 'CREDIT'
}

/** YYYY-MM-DD だけを通す。それ以外は null。 */
export function normalizeDate(v: unknown): string | null {
  const s = String(v ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/** 学習ルールの1件ぶん（取引先 × 品目 → 科目）。 */
export interface RulePair {
  vendorName: string
  itemName: string
  accountCode: string
  costType: CostType
}

/**
 * 「取引先 × 品目」→ 科目 を学習ルールへ保存する（仕様§3-4）。同じ組み合わせは hit_count を増やして上書き。
 * 何件あっても1 batch（＝1 subrequest）で流す。件数ぶん run すると Workers の subrequest 上限に当たる。
 */
export async function learnRulePairs(db: any, userId: string, pairs: RulePair[]): Promise<void> {
  const uniq = new Map<string, RulePair>()
  for (const p of pairs) {
    const vendor = p.vendorName.trim()
    const item = p.itemName.trim()
    if (!vendor || !item) continue
    uniq.set(`${vendor}|${item}`, { ...p, vendorName: vendor, itemName: item })
  }
  if (!uniq.size) return

  const stmt = db.prepare(
    `INSERT INTO farm_manager_rules (id, user_id, vendor_name_pattern, item_name_pattern, account_code, cost_type, hit_count)
     VALUES (?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(user_id, vendor_name_pattern, item_name_pattern)
     DO UPDATE SET account_code = excluded.account_code,
                   cost_type = excluded.cost_type,
                   hit_count = hit_count + 1,
                   updated_at = datetime('now')`
  )
  await db.batch([...uniq.values()].map((p) => stmt.bind(newId(), userId, p.vendorName, p.itemName, p.accountCode, p.costType)))
}

/** 保存された取引のうち、人が確定した明細だけを学習ルールへ回す。仮置きのままの明細は学習しない。 */
export async function learnRules(
  db: any,
  userId: string,
  vendorName: string,
  items: { itemName: string; accountCode: string; costType: CostType; confirmedByUser: boolean; isProvisional: boolean }[]
): Promise<void> {
  const vendor = vendorName.trim()
  if (!vendor) return
  await learnRulePairs(
    db,
    userId,
    items
      .filter((i) => i.confirmedByUser && !i.isProvisional)
      .map((i) => ({ vendorName: vendor, itemName: i.itemName, accountCode: i.accountCode, costType: i.costType }))
  )
}

// ── 取引の読み書き ──────────────────────────────

interface TxRow {
  id: string
  image_url: string
  vendor_name: string
  occurred_at: string
  paid_at: string | null
  payment_type: string
  note: string
  created_at: string
}

interface ItemRow {
  id: string
  transaction_id: string
  item_name: string
  quantity: number | null
  unit_price: number | null
  amount: number
  account_code: string
  cost_type: string
  confidence_score: number
  needs_confirmation: number
  is_provisional: number
  confirmed_by_user: number
  worker_id: string | null
  reason: string
  sort_order: number
}

export function shapeItem(row: ItemRow): TransactionItem {
  return {
    id: row.id,
    itemName: row.item_name,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    amount: row.amount,
    accountCode: row.account_code,
    costType: (normalizeCostType(row.cost_type) ?? 'VARIABLE') as CostType,
    confidenceScore: row.confidence_score,
    needsConfirmation: !!row.needs_confirmation,
    isProvisional: !!row.is_provisional,
    confirmedByUser: !!row.confirmed_by_user,
    workerId: row.worker_id,
    reason: row.reason,
  }
}

function shapeTransaction(row: TxRow, items: ItemRow[]): Transaction {
  const shaped = items.map(shapeItem)
  return {
    id: row.id,
    imageUrl: row.image_url,
    vendorName: row.vendor_name,
    occurredAt: row.occurred_at,
    paidAt: row.paid_at,
    paymentType: normalizePaymentType(row.payment_type),
    note: row.note,
    createdAt: row.created_at,
    items: shaped,
    totalAmount: shaped.reduce((sum, i) => sum + (i.amount || 0), 0),
  }
}

/** 取引一覧。month 指定（YYYY-MM）があればその月の発生ぶんだけ。画像は重いので一覧では返さない。 */
export async function loadTransactions(
  db: any,
  userId: string,
  opts: { month?: string; limit?: number } = {}
): Promise<Transaction[]> {
  const where = ['user_id = ?']
  const binds: any[] = [userId]
  if (opts.month) {
    where.push("substr(occurred_at, 1, 7) = ?")
    binds.push(opts.month)
  }
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500)
  const txRows = await db
    .prepare(
      `SELECT id, '' AS image_url, vendor_name, occurred_at, paid_at, payment_type, note, created_at
       FROM farm_manager_transactions WHERE ${where.join(' AND ')}
       ORDER BY occurred_at DESC, created_at DESC LIMIT ${limit}`
    )
    .bind(...binds)
    .all<TxRow>()
  const txs: TxRow[] = txRows?.results ?? []
  if (!txs.length) return []

  const ids = txs.map((t) => t.id)
  const placeholders = ids.map(() => '?').join(',')
  const itemRows = await db
    .prepare(`SELECT * FROM farm_manager_items WHERE transaction_id IN (${placeholders}) ORDER BY sort_order ASC`)
    .bind(...ids)
    .all<ItemRow>()

  const byTx = new Map<string, ItemRow[]>()
  for (const it of itemRows?.results ?? []) {
    if (!byTx.has(it.transaction_id)) byTx.set(it.transaction_id, [])
    byTx.get(it.transaction_id)!.push(it)
  }
  return txs.map((t) => shapeTransaction(t, byTx.get(t.id) ?? []))
}

/** 単一取引（画像込み・所有者チェック込み）。無ければ null。 */
export async function loadTransaction(db: any, userId: string, id: string): Promise<Transaction | null> {
  const row = await db
    .prepare('SELECT * FROM farm_manager_transactions WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<TxRow>()
  if (!row) return null
  const itemRows = await db
    .prepare('SELECT * FROM farm_manager_items WHERE transaction_id = ? ORDER BY sort_order ASC')
    .bind(id)
    .all<ItemRow>()
  return shapeTransaction(row, itemRows?.results ?? [])
}

export interface SaveItemInput {
  itemName: string
  quantity: number | null
  unitPrice: number | null
  amount: number
  accountCode: string
  costType: CostType
  confidenceScore: number
  needsConfirmation: boolean
  isProvisional: boolean
  confirmedByUser: boolean
  workerId: string | null
  reason: string
}

export interface SaveTransactionInput {
  imageUrl: string
  vendorName: string
  occurredAt: string
  paidAt: string | null
  paymentType: PaymentType
  note: string
  items: SaveItemInput[]
}

/** クライアントから来た取引を検証して正規化する。分類が決まっていなくても通す（仕様§3-3）。 */
export function normalizeSaveInput(body: any, accounts: AccountMaster[]): SaveTransactionInput {
  const index = accountIndex(accounts)
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
  const rawItems: any[] = Array.isArray(body?.items) ? body.items : []

  const items: SaveItemInput[] = rawItems
    .map((raw) => {
      const code = String(raw?.accountCode ?? '').trim().toUpperCase()
      const account = index.get(code) ?? index.get(PROVISIONAL_VARIABLE)!
      const costType = normalizeCostType(raw?.costType) ?? CATEGORY_TO_COST_TYPE[account.category]
      return {
        itemName: String(raw?.itemName ?? '').trim(),
        quantity: toNumber(raw?.quantity),
        unitPrice: toNumber(raw?.unitPrice),
        amount: Math.round(toNumber(raw?.amount) ?? 0),
        accountCode: account.code,
        costType,
        confidenceScore: clamp01(toNumber(raw?.confidenceScore) ?? 0),
        needsConfirmation: !!raw?.needsConfirmation && !raw?.confirmedByUser,
        isProvisional: account.isProvisionalBucket,
        confirmedByUser: !!raw?.confirmedByUser,
        workerId: account.code === 'VAR001' ? (String(raw?.workerId ?? '').trim() || null) : null,
        reason: String(raw?.reason ?? '').slice(0, 200),
      }
    })
    .filter((i) => i.itemName || i.amount)

  if (!items.length) throw createError({ statusCode: 400, message: '明細が1行もありません' })

  return {
    imageUrl: typeof body?.imageUrl === 'string' && body.imageUrl.startsWith('data:image/') ? body.imageUrl : '',
    vendorName: String(body?.vendorName ?? '').trim(),
    occurredAt: normalizeDate(body?.occurredAt) ?? today,
    paidAt: normalizeDate(body?.paidAt),
    paymentType: normalizePaymentType(body?.paymentType),
    note: String(body?.note ?? '').slice(0, 500),
    items,
  }
}

/** 取引を1件保存（新規 or 上書き）。明細は全入れ替え。 */
export async function saveTransaction(
  db: any,
  userId: string,
  input: SaveTransactionInput,
  existingId?: string
): Promise<string> {
  const id = existingId ?? newId()
  const statements: any[] = []

  if (existingId) {
    statements.push(
      db
        .prepare(
          `UPDATE farm_manager_transactions
           SET image_url = CASE WHEN ? = '' THEN image_url ELSE ? END,
               vendor_name = ?, occurred_at = ?, paid_at = ?, payment_type = ?, note = ?
           WHERE id = ? AND user_id = ?`
        )
        .bind(input.imageUrl, input.imageUrl, input.vendorName, input.occurredAt, input.paidAt, input.paymentType, input.note, id, userId)
    )
    statements.push(db.prepare('DELETE FROM farm_manager_items WHERE transaction_id = ? AND user_id = ?').bind(id, userId))
  } else {
    statements.push(
      db
        .prepare(
          `INSERT INTO farm_manager_transactions (id, user_id, image_url, vendor_name, occurred_at, paid_at, payment_type, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(id, userId, input.imageUrl, input.vendorName, input.occurredAt, input.paidAt, input.paymentType, input.note)
    )
  }

  const itemStmt = db.prepare(
    `INSERT INTO farm_manager_items
       (id, transaction_id, user_id, item_name, quantity, unit_price, amount, account_code, cost_type,
        confidence_score, needs_confirmation, is_provisional, confirmed_by_user, worker_id, reason, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  input.items.forEach((item, i) => {
    statements.push(
      itemStmt.bind(
        newId(),
        id,
        userId,
        item.itemName,
        item.quantity,
        item.unitPrice,
        item.amount,
        item.accountCode,
        item.costType,
        item.confidenceScore,
        item.needsConfirmation ? 1 : 0,
        item.isProvisional ? 1 : 0,
        item.confirmedByUser ? 1 : 0,
        item.workerId,
        item.reason,
        i
      )
    )
  })

  // まとめて1 subrequest で流す（明細1行ごとに run すると Workers の subrequest 上限に近づく）
  await db.batch(statements)
  return id
}

// ── 従事者 ──────────────────────────────

export async function loadWorkers(db: any, userId: string): Promise<Worker[]> {
  const rows = await db
    .prepare('SELECT * FROM farm_manager_workers WHERE user_id = ? ORDER BY created_at ASC')
    .bind(userId)
    .all<any>()
  return (rows?.results ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    employmentType: r.employment_type,
    monthlyCost: r.monthly_cost,
    active: !!r.active,
  }))
}

// ── 設定 ──────────────────────────────

export async function loadSettings(db: any, userId: string): Promise<FarmSettings> {
  const row = await db
    .prepare('SELECT farm_name, cultivated_area_a, opening_cash FROM farm_manager_settings WHERE user_id = ?')
    .bind(userId)
    .first<{ farm_name: string; cultivated_area_a: number; opening_cash: number }>()
  return {
    farmName: row?.farm_name ?? '',
    cultivatedAreaA: row?.cultivated_area_a ?? 0,
    openingCash: row?.opening_cash ?? 0,
  }
}

// ── 月次集計（ウォーターフォール）──────────────────────────────

function emptyTotals(): LadderTotals {
  return {
    revenue: 0,
    variable: 0,
    grossProfit: 0,
    fixed: 0,
    operatingProfit: 0,
    nonOperatingIncome: 0,
    nonOperatingExpense: 0,
    ordinaryProfit: 0,
    depreciation: 0,
    financeIn: 0,
    financeOut: 0,
    cashChange: 0,
  }
}

function finishTotals(t: LadderTotals): LadderTotals {
  t.grossProfit = t.revenue - t.variable
  t.operatingProfit = t.grossProfit - t.fixed
  t.ordinaryProfit = t.operatingProfit + t.nonOperatingIncome - t.nonOperatingExpense
  // H. 現金増減額 = 経常利益 + 減価償却費の足し戻し + 借入金 - 返済
  t.cashChange = t.ordinaryProfit + t.depreciation + t.financeIn - t.financeOut
  return t
}

interface MonthAccountRow {
  ym: string
  account_code: string
  cost_type: string
  amount: number
}

function addRow(t: LadderTotals, row: MonthAccountRow, depreciationCodes: Set<string>): void {
  const amount = row.amount || 0
  switch (row.cost_type) {
    case 'REVENUE':
      t.revenue += amount
      break
    case 'VARIABLE':
      t.variable += amount
      break
    case 'FIXED':
      t.fixed += amount
      if (depreciationCodes.has(row.account_code)) t.depreciation += amount
      break
    case 'NON_OPERATING':
      if (row.account_code === 'NOP004') t.nonOperatingExpense += amount
      else t.nonOperatingIncome += amount
      break
    case 'FINANCE':
      if (row.account_code === 'FIN002') t.financeOut += amount
      else t.financeIn += amount
      break
  }
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(Date.UTC(y!, (m! - 1) + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

/**
 * 月次サマリー（仕様§6-2）。発生日(occurred_at)ベースで集計する。
 * 前年同月・当年度の累積まで1クエリで取りたいので「前年1月〜当月末」をまとめて引き、JS側で振り分ける。
 * D1へのアクセス回数を増やさないため（Workers の subrequest 上限対策）。
 */
export async function buildMonthlySummary(db: any, userId: string, month: string): Promise<MonthlySummary> {
  const accounts = await loadAccounts(db, userId)
  const nameByCode = new Map(accounts.map((a) => [a.code, a.name]))
  const depreciationCodes = new Set(accounts.filter((a) => a.isDepreciation).map((a) => a.code))

  const year = Number(month.slice(0, 4))
  const from = `${year - 1}-01-01`
  const to = `${month}-31`

  const rows = await db
    .prepare(
      `SELECT substr(t.occurred_at, 1, 7) AS ym, i.account_code, i.cost_type, SUM(i.amount) AS amount
       FROM farm_manager_items i
       JOIN farm_manager_transactions t ON t.id = i.transaction_id
       WHERE i.user_id = ? AND t.occurred_at >= ? AND t.occurred_at <= ?
       GROUP BY ym, i.account_code, i.cost_type`
    )
    .bind(userId, from, to)
    .all<MonthAccountRow>()
  const all: MonthAccountRow[] = rows?.results ?? []

  const prevMonthKey = shiftMonth(month, -1)
  const prevYearKey = shiftMonth(month, -12)

  const totals = emptyTotals()
  const prevMonth = emptyTotals()
  const prevYear = emptyTotals()
  // J. 期首現金残高＝年度はじめ（1月）からの当月より前の現金増減の累積（会計年度は暦年とする）
  const ytdBefore = emptyTotals()
  const breakdownMap = { revenue: new Map<string, number>(), variable: new Map<string, number>(), fixed: new Map<string, number>() }

  for (const row of all) {
    if (row.ym === month) {
      addRow(totals, row, depreciationCodes)
      const bucket =
        row.cost_type === 'REVENUE' ? breakdownMap.revenue : row.cost_type === 'VARIABLE' ? breakdownMap.variable : row.cost_type === 'FIXED' ? breakdownMap.fixed : null
      if (bucket) bucket.set(row.account_code, (bucket.get(row.account_code) ?? 0) + (row.amount || 0))
    }
    if (row.ym === prevMonthKey) addRow(prevMonth, row, depreciationCodes)
    if (row.ym === prevYearKey) addRow(prevYear, row, depreciationCodes)
    if (row.ym >= `${year}-01` && row.ym < month) addRow(ytdBefore, row, depreciationCodes)
  }

  finishTotals(totals)
  finishTotals(prevMonth)
  finishTotals(prevYear)
  finishTotals(ytdBefore)

  const settings = await loadSettings(db, userId)
  const openingCash = settings.openingCash + ytdBefore.cashChange

  const toRows = (map: Map<string, number>) => {
    const sum = [...map.values()].reduce((a, b) => a + b, 0)
    return [...map.entries()]
      .map(([code, amount]) => ({
        accountCode: code,
        accountName: nameByCode.get(code) ?? code,
        amount,
        ratio: sum > 0 ? amount / sum : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }

  // 取引先別・仮置き・要確認・未払いは別クエリ（当月ぶんだけ）
  const [vendorRows, flags] = await db.batch([
    db
      .prepare(
        `SELECT t.vendor_name AS vendor_name, SUM(i.amount) AS amount
         FROM farm_manager_items i
         JOIN farm_manager_transactions t ON t.id = i.transaction_id
         WHERE i.user_id = ? AND substr(t.occurred_at, 1, 7) = ? AND i.cost_type IN ('VARIABLE','FIXED')
         GROUP BY t.vendor_name ORDER BY amount DESC LIMIT 20`
      )
      .bind(userId, month),
    db
      .prepare(
        `SELECT
           SUM(CASE WHEN i.is_provisional = 1 THEN 1 ELSE 0 END) AS prov_count,
           SUM(CASE WHEN i.is_provisional = 1 THEN i.amount ELSE 0 END) AS prov_amount,
           -- 仮置きの明細は上の prov_count で数えているので、ここでは重ねて数えない
           -- （画面は prov + conf を足して「分類がまだの明細」として出すため、二重に数えると件数と金額がずれる）
           SUM(CASE WHEN i.needs_confirmation = 1 AND i.confirmed_by_user = 0 AND i.is_provisional = 0 THEN 1 ELSE 0 END) AS conf_count,
           SUM(CASE WHEN i.needs_confirmation = 1 AND i.confirmed_by_user = 0 AND i.is_provisional = 0 THEN i.amount ELSE 0 END) AS conf_amount,
           -- 未払いは「伝票が何枚たまっているか」なので、明細ではなく取引を数える
           COUNT(DISTINCT CASE WHEN t.payment_type = 'CREDIT' AND t.paid_at IS NULL THEN t.id END) AS unpaid_count,
           SUM(CASE WHEN t.payment_type = 'CREDIT' AND t.paid_at IS NULL THEN i.amount ELSE 0 END) AS unpaid_amount,
           COUNT(DISTINCT t.id) AS tx_count
         FROM farm_manager_items i
         JOIN farm_manager_transactions t ON t.id = i.transaction_id
         WHERE i.user_id = ? AND substr(t.occurred_at, 1, 7) = ?`
      )
      .bind(userId, month),
  ])

  const f = flags?.results?.[0] ?? {}

  return {
    month,
    totals,
    prevMonth,
    prevYear,
    openingCash,
    closingCash: openingCash + totals.cashChange,
    breakdown: {
      revenue: toRows(breakdownMap.revenue),
      variable: toRows(breakdownMap.variable),
      fixed: toRows(breakdownMap.fixed),
    },
    vendors: (vendorRows?.results ?? []).map((r: any) => ({ vendorName: r.vendor_name || '（取引先不明）', amount: r.amount || 0 })),
    provisional: { count: f.prov_count ?? 0, amount: f.prov_amount ?? 0 },
    needsConfirmation: { count: f.conf_count ?? 0, amount: f.conf_amount ?? 0 },
    unpaid: { count: f.unpaid_count ?? 0, amount: f.unpaid_amount ?? 0 },
    cultivatedAreaA: settings.cultivatedAreaA,
    transactionCount: f.tx_count ?? 0,
  }
}

/**
 * 1年ぶん（1月〜12月）の損益のはしごを月ごとに返す。Excelへのエクスポート（§8）で使う。
 * 12ヶ月ぶんを1クエリで引いてJSで振り分ける＝ D1 アクセスは1回だけ。
 */
export async function buildYearLadder(db: any, userId: string, year: number): Promise<{ month: string; totals: LadderTotals }[]> {
  const accounts = await loadAccounts(db, userId)
  const depreciationCodes = new Set(accounts.filter((a) => a.isDepreciation).map((a) => a.code))

  const rows = await db
    .prepare(
      `SELECT substr(t.occurred_at, 1, 7) AS ym, i.account_code, i.cost_type, SUM(i.amount) AS amount
       FROM farm_manager_items i
       JOIN farm_manager_transactions t ON t.id = i.transaction_id
       WHERE i.user_id = ? AND t.occurred_at >= ? AND t.occurred_at <= ?
       GROUP BY ym, i.account_code, i.cost_type`
    )
    .bind(userId, `${year}-01-01`, `${year}-12-31`)
    .all<MonthAccountRow>()

  const byMonth = new Map<string, LadderTotals>()
  for (let m = 1; m <= 12; m++) byMonth.set(`${year}-${String(m).padStart(2, '0')}`, emptyTotals())
  for (const row of rows?.results ?? []) {
    const t = byMonth.get(row.ym)
    if (t) addRow(t, row, depreciationCodes)
  }
  return [...byMonth.entries()].map(([month, totals]) => ({ month, totals: finishTotals(totals) }))
}

/** 明細をExcel向けに1行ずつ吐くための取得（期間指定）。 */
export async function loadItemRowsForExport(
  db: any,
  userId: string,
  from: string,
  to: string
): Promise<any[]> {
  const rows = await db
    .prepare(
      `SELECT t.occurred_at, t.paid_at, t.payment_type, t.vendor_name, t.note,
              i.item_name, i.quantity, i.unit_price, i.amount, i.account_code, i.cost_type,
              i.is_provisional, i.needs_confirmation, i.confirmed_by_user, i.confidence_score,
              a.name AS account_name, w.name AS worker_name
       FROM farm_manager_items i
       JOIN farm_manager_transactions t ON t.id = i.transaction_id
       LEFT JOIN farm_manager_accounts a ON a.user_id = i.user_id AND a.code = i.account_code
       LEFT JOIN farm_manager_workers w ON w.id = i.worker_id
       WHERE i.user_id = ? AND t.occurred_at >= ? AND t.occurred_at <= ?
       ORDER BY t.occurred_at ASC, i.sort_order ASC`
    )
    .bind(userId, from, to)
    .all<any>()
  return rows?.results ?? []
}

// ── CSV（Excelとの並行運用。仕様§8）──────────────────────────────

export function csvField(v: unknown): string {
  const s = String(v ?? '')
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** UTF-8 BOM付きで返す（Excelで開いても文字化けしない）。 */
export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n'
}

/** ダブルクォート対応の素朴なCSVパーサ。Excelが吐くCSVを読む用。 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const src = text.replace(/^﻿/, '')

  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++ } else inQuotes = false
      } else field += c
      continue
    }
    if (c === '"') { inQuotes = true; continue }
    if (c === ',') { row.push(field); field = ''; continue }
    if (c === '\r') continue
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    field += c
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter((r) => r.some((c) => c.trim()))
}

/** Excelの日付表記（2026/7/3・令和6年7月3日・2026-07-03）を YYYY-MM-DD に寄せる。 */
export function looseDate(raw: string, fallbackYear: number): string | null {
  const s = (raw ?? '').trim()
  if (!s) return null
  const iso = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, '0')}-${iso[3]!.padStart(2, '0')}`
  const jp = s.match(/^(\d{4})年\s*(\d{1,2})月\s*(\d{1,2})日/)
  if (jp) return `${jp[1]}-${jp[2]!.padStart(2, '0')}-${jp[3]!.padStart(2, '0')}`
  const md = s.match(/^(\d{1,2})[-/.](\d{1,2})$/)
  if (md) return `${fallbackYear}-${md[1]!.padStart(2, '0')}-${md[2]!.padStart(2, '0')}`
  return null
}
