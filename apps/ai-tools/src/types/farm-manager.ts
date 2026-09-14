// 農家向け 経費・経営管理アプリ (farm-manager) の型と勘定科目マスタ。
//
// 設計の第一原則は「既存Excel『10カ年収支計画表』の構造をそのまま写し取る」こと（仕様§0）。
//   A. 売上高計
//   B. 原価計(変動費)   ← 畑で発生する経費
//   C. 粗利益 (A - B)
//   D. 販管費計(固定費) ← 畑の外で発生する費用
//   E. 営業利益 (C - D)
//   F. 営業外損益（雑収入 / 営業外費用）
//   G. 経常利益 (E + F)
//   H. 現金増減額（G + 減価償却費の足し戻し + 借入金 - 返済）
//   J. 期首現金残高 / K. 期末現金残高 (H + J)
//
// ⚠ 仕様書のデータモデルからの意図的な追加が2つある。どちらも上のはしごを画面に出すために必要:
//   1. cost_type に 'REVENUE'（A.売上高）と 'FINANCE'（H.借入金/返済）を足した。
//      仕様の VARIABLE/FIXED/NON_OPERATING だけでは A と H が表現できず、ウォーターフォール（§6-2）が描けない。
//      売上の「品種別シミュレーション」はフェーズ2のままで、ここでは金額だけを受け取る。
//   2. AccountMaster を user_id でスコープした。Excelの運用ポイント①「発生している項目を追加する」を
//      アプリでも許すため（初回アクセス時に下記マスタをシードする）。

export type AccountCategory = 'A_REVENUE' | 'B_VARIABLE' | 'D_FIXED' | 'F_NON_OPERATING' | 'H_FINANCE'
export type CostType = 'REVENUE' | 'VARIABLE' | 'FIXED' | 'NON_OPERATING' | 'FINANCE'
export type PaymentType = 'CASH' | 'CREDIT'
export type EmploymentType = 'FAMILY' | 'EMPLOYEE' | 'PART_TIME'

/** 確信度がこれ未満なら「要確認」として人に確認させる（仕様§4.1-5） */
export const CONFIDENCE_THRESHOLD = 0.7

/** 仮置き用の科目コード（分類がわからないものはここへ入れて先に進む。仕様§3-3） */
export const PROVISIONAL_VARIABLE = 'VAR999'
export const PROVISIONAL_FIXED = 'FIX999'

export interface AccountMaster {
  code: string
  name: string
  category: AccountCategory
  /** 減価償却費フラグ（H.現金増減額で足し戻す対象） */
  isDepreciation: boolean
  /** 仮置き用科目かどうか */
  isProvisionalBucket: boolean
  /** 用途によって変動費・固定費どちらにもなり得る科目（仕様§3-2）。AIの確信度に関わらず確認を促す */
  splitRisk: boolean
  /** 補足（UIのヒントに出す） */
  note: string
  /** ユーザーが自分で足した科目 */
  isCustom?: boolean
  sortOrder?: number
}

type Seed = [code: string, name: string, note: string, opts?: { dep?: boolean; prov?: boolean; split?: boolean }]

function build(category: AccountCategory, seeds: Seed[], offset: number): AccountMaster[] {
  return seeds.map(([code, name, note, opts], i) => ({
    code,
    name,
    category,
    isDepreciation: !!opts?.dep,
    isProvisionalBucket: !!opts?.prov,
    splitRisk: !!opts?.split,
    note,
    sortOrder: offset + i,
  }))
}

// ── A. 売上高（仕様ではフェーズ2だが、損益のはしごを描くため金額だけ受け取る）──
// 販路で分けてあるのは §7-2「販路別の収益性分析」への布石。今は単なる内訳として集計できる。
const REVENUE = build('A_REVENUE', [
  ['REV001', '組合・JA出荷', '全量引き取り。単価は市場任せ'],
  ['REV002', '直販（個人）', '単価は高いが、やり取りの労力が大きい'],
  ['REV003', '飲食店向け', '単価が高くブランディング効果がある'],
  ['REV004', '直売所', ''],
  ['REV999', 'その他売上', '', { prov: true }],
], 0)

// ── B. 原価計（変動費）＝ 畑で発生する経費 ──
const VARIABLE = build('B_VARIABLE', [
  ['VAR001', '人件費', '家族従事者は従事者ごとに内訳を持てる'],
  ['VAR002', '肥料費', '農業簿記特有科目'],
  ['VAR003', '農薬費（農薬衛生費）', '共同防除の自己負担分を含む'],
  ['VAR004', '種苗費', '農業簿記特有科目'],
  ['VAR005', '資材費（袋等）', '袋掛け用の袋など', { split: true }],
  ['VAR006', '農具費', '10万円未満 or 使用1年未満の農具'],
  ['VAR007', '燃料費', '農機具の燃料', { split: true }],
  ['VAR008', '修繕費', '農機具・畑設備の修繕', { split: true }],
  ['VAR009', '動力費', ''],
  ['VAR010', '素畜費', '畜産向け'],
  ['VAR011', '飼料費', '畜産向け'],
  ['VAR012', '土地改良費', '客土購入費等'],
  ['VAR013', '作業委託費', '賃耕料・刈取料・共同施設利用料'],
  ['VAR014', '外国人研修費', ''],
  ['VAR999', 'その他経費（変動費）', '分類不明はここに仮置きして後で振り替える', { prov: true }],
], 100)

// ── D. 販管費計（固定費）＝ 畑の外で発生する費用 ──
const FIXED = build('D_FIXED', [
  ['FIX001', '農協資材費', 'JA経由の資材費。その他資材費と区別して管理する', { split: true }],
  ['FIX002', 'その他資材費', 'JA以外から購入した資材', { split: true }],
  ['FIX003', '地代家賃（小作料・賃借料）', '農地・農機具の賃借料'],
  ['FIX004', '運賃', '出荷にかかる配送費'],
  ['FIX005', '水道光熱費', '農業用と生活用が混在しやすい', { split: true }],
  ['FIX006', '通信費', ''],
  ['FIX007', '予冷費', '果樹特有'],
  ['FIX008', '手数料', 'JA・市場への出荷手数料等'],
  ['FIX009', '旅費交通費', ''],
  ['FIX010', '租税公課', ''],
  ['FIX011', '保険費（農業共済掛金）', ''],
  ['FIX012', '車両費', '営業・配送用車両', { split: true }],
  ['FIX013', '減価償却費', '現金は出ていかない＝H.現金増減額で足し戻す', { dep: true }],
  ['FIX014', '広告宣伝費', ''],
  ['FIX015', 'リース費', ''],
  ['FIX016', '研修費', ''],
  ['FIX017', '雑費', ''],
  ['FIX999', 'その他経費（固定費）', '分類不明はここに仮置きして後で振り替える', { prov: true }],
], 200)

// ── F. 営業外損益 ──
// 補助金・助成金は営業外収益として明確に分離する（売上に混ぜると本業の収益性が見えなくなるため。仕様§2-3）
const NON_OPERATING = build('F_NON_OPERATING', [
  ['NOP001', '受取利息', '雑収入'],
  ['NOP002', '受取配当金', '雑収入'],
  ['NOP003', '助成金収入', '雑収入。売上には混ぜない'],
  ['NOP004', '支払利息', '営業外費用'],
], 300)

// ── H. 現金増減（損益ではない資金の出入り）──
const FINANCE = build('H_FINANCE', [
  ['FIN001', '借入金', '増額計'],
  ['FIN002', '借入金返済', '減額計'],
], 400)

export const ACCOUNT_SEED: AccountMaster[] = [...REVENUE, ...VARIABLE, ...FIXED, ...NON_OPERATING, ...FINANCE]

/** 科目の区分 → 明細の cost_type（明細側は区分をそのまま持つが、振替時の既定値としてここから引く） */
export const CATEGORY_TO_COST_TYPE: Record<AccountCategory, CostType> = {
  A_REVENUE: 'REVENUE',
  B_VARIABLE: 'VARIABLE',
  D_FIXED: 'FIXED',
  F_NON_OPERATING: 'NON_OPERATING',
  H_FINANCE: 'FINANCE',
}

export const CATEGORY_LABEL: Record<AccountCategory, string> = {
  A_REVENUE: 'A. 売上高',
  B_VARIABLE: 'B. 変動費（畑の中）',
  D_FIXED: 'D. 固定費（畑の外）',
  F_NON_OPERATING: 'F. 営業外',
  H_FINANCE: 'H. 資金の出入り',
}

export const COST_TYPE_LABEL: Record<CostType, string> = {
  REVENUE: '売上',
  VARIABLE: '変動費',
  FIXED: '固定費',
  NON_OPERATING: '営業外',
  FINANCE: '資金',
}

export const EMPLOYMENT_LABEL: Record<EmploymentType, string> = {
  FAMILY: '家族',
  EMPLOYEE: '従業員',
  PART_TIME: 'パート・アルバイト',
}

// ── 取引 ──────────────────────────────

export interface TransactionItem {
  id: string
  itemName: string
  quantity: number | null
  unitPrice: number | null
  amount: number
  accountCode: string
  costType: CostType
  confidenceScore: number
  needsConfirmation: boolean
  /** 仮置き（その他経費に置いたまま）フラグ */
  isProvisional: boolean
  confirmedByUser: boolean
  /** 人件費(VAR001)のときの従事者 */
  workerId: string | null
  /** AIが分類理由をひとことで書く。確認画面に出す */
  reason: string
}

export interface Transaction {
  id: string
  imageUrl: string
  vendorName: string
  /** 発生日（納品日）。集計は必ずこちらを使う＝発生主義（仕様§4-2） */
  occurredAt: string
  /** 支払日。掛け払いのため後日確定するので nullable */
  paidAt: string | null
  paymentType: PaymentType
  note: string
  createdAt: string
  items: TransactionItem[]
  totalAmount: number
}

/** AIが画像から抜いた下書き（DBには保存しない） */
export interface ExtractedItem {
  item_name: string
  quantity: number | null
  unit_price: number | null
  amount: number
  account_code: string
  cost_type: CostType
  confidence: number
  reason: string
  needs_confirmation: boolean
  is_provisional: boolean
  /** 学習ルール（UserAccountRule）が当たった明細。AIの判定より優先した印 */
  matched_rule: boolean
}

export interface Extraction {
  vendor_name: string
  occurred_at: string | null
  paid_at: string | null
  payment_type: PaymentType
  document_type: string
  items: ExtractedItem[]
  total_amount: number
  /** 読み取れなかった点・確認してほしい点 */
  warnings: string[]
}

// ── 従事者・学習ルール・設定 ──────────────────────────────

export interface Worker {
  id: string
  name: string
  employmentType: EmploymentType
  monthlyCost: number
  active: boolean
}

export interface AccountRule {
  id: string
  vendorNamePattern: string
  itemNamePattern: string
  accountCode: string
  costType: CostType
  hitCount: number
  updatedAt: string
}

export interface FarmSettings {
  farmName: string
  /** 栽培面積(a)。経費を「10aあたり」に按分表示するために使う（仕様§7-1） */
  cultivatedAreaA: number
  /** 期首現金残高(J)。年度はじめの現金 */
  openingCash: number
}

// ── 月次サマリー ──────────────────────────────

export interface BreakdownRow {
  accountCode: string
  accountName: string
  amount: number
  ratio: number
}

export interface LadderTotals {
  revenue: number
  variable: number
  grossProfit: number
  fixed: number
  operatingProfit: number
  nonOperatingIncome: number
  nonOperatingExpense: number
  ordinaryProfit: number
  depreciation: number
  financeIn: number
  financeOut: number
  cashChange: number
}

export interface MonthlySummary {
  month: string
  totals: LadderTotals
  prevMonth: LadderTotals | null
  prevYear: LadderTotals | null
  /** J. 期首現金残高（年初の設定値＋当月より前の現金増減の累積） */
  openingCash: number
  /** K. 期末現金残高 */
  closingCash: number
  breakdown: {
    revenue: BreakdownRow[]
    variable: BreakdownRow[]
    fixed: BreakdownRow[]
  }
  vendors: { vendorName: string; amount: number }[]
  provisional: { count: number; amount: number }
  needsConfirmation: { count: number; amount: number }
  /** 未払い（掛け払いで paid_at が未設定）の合計 */
  unpaid: { count: number; amount: number }
  cultivatedAreaA: number
  transactionCount: number
}

/** 確認画面で編集中の明細（クライアント側のフォーム用） */
export interface EditableItem {
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

/** 仮置き一覧の1行（明細＋どの取引のものか） */
export interface ProvisionalItem extends TransactionItem {
  transactionId: string
  vendorName: string
  occurredAt: string
  accountName: string
}
