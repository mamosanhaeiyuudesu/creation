// 農家向け 経営シミュレーション (farm-simulation) の型と、確定申告書の科目マスタ。
//
// 入口は「青色申告決算書（農業所得用）」の損益計算書。白色の「収支内訳書（農業所得用）」も科目はほぼ同じ。
// 確定申告用の正確な帳簿づくりが目的ではなく、大まかな利益の動きをつかむための道具なので、
// 棚卸しの増減や育成費用の振替などは読み取りはしても試算には使わない（前年並みで消える前提）。

/** 試算でのまとまり。前提条件（上昇率）はこの単位でかかる。 */
export type ExpenseGroup = 'material' | 'labor' | 'depreciation' | 'other'

export interface TaxItemDef {
  key: string
  label: string
  group?: ExpenseGroup
  hint?: string
}

/** 収入の科目（損益計算書の①〜③）。 */
export const REVENUE_ITEMS: TaxItemDef[] = [
  { key: 'sales', label: '販売金額', hint: '桃・野菜などを売った金額' },
  { key: 'homeUse', label: '家事消費・事業消費金額' },
  { key: 'misc', label: '雑収入', hint: '補助金・作業受託など' },
]

/**
 * 経費の科目。並びは決算書の印刷順に合わせる（見比べながら直すため）。
 * group は試算でどの上昇率をかけるか。資材費＝「資材費の上昇率」、人件費＝「人件費の変化」。
 * 荷造運賃手数料は桃の箱代が入ることが多いので資材費側に寄せている。
 */
export const EXPENSE_ITEMS: TaxItemDef[] = [
  { key: 'taxes', label: '租税公課', group: 'other' },
  { key: 'seeds', label: '種苗費', group: 'material' },
  { key: 'livestock', label: '素畜費', group: 'material' },
  { key: 'fertilizer', label: '肥料費', group: 'material' },
  { key: 'feed', label: '飼料費', group: 'material' },
  { key: 'tools', label: '農具費', group: 'material' },
  { key: 'pesticide', label: '農薬・衛生費', group: 'material' },
  { key: 'materials', label: '諸材料費', group: 'material' },
  { key: 'repair', label: '修繕費', group: 'other' },
  { key: 'energy', label: '動力光熱費', group: 'material', hint: '燃料・電気' },
  { key: 'clothing', label: '作業用衣料費', group: 'other' },
  { key: 'mutualAid', label: '農業共済掛金', group: 'other' },
  { key: 'depreciation', label: '減価償却費', group: 'depreciation', hint: '試算では毎年同じ額' },
  { key: 'packing', label: '荷造運賃手数料', group: 'material', hint: '箱代・運賃・出荷手数料' },
  { key: 'wages', label: '雇人費', group: 'labor', hint: 'パート・アルバイト代' },
  { key: 'interest', label: '利子割引料', group: 'other' },
  { key: 'rent', label: '地代・賃借料', group: 'other' },
  { key: 'landImprovement', label: '土地改良費', group: 'other' },
  { key: 'otherExpense', label: 'その他の経費', group: 'other', hint: '空欄の科目に書いたもの' },
  { key: 'miscExpense', label: '雑費', group: 'other' },
  { key: 'familyWages', label: '専従者給与', group: 'labor', hint: '家族に払う給与' },
]

export const GROUP_LABELS: Record<ExpenseGroup, string> = {
  material: '資材費',
  labor: '人件費',
  depreciation: '減価償却費',
  other: 'その他の経費',
}

export type YearStatus = 'draft' | 'confirmed'

/** 1年ぶんの確定申告の数字。draft＝読み取っただけ（確認前）、confirmed＝過去の実績として確定。 */
export interface TaxYear {
  id: string
  year: number
  status: YearStatus
  revenue: Record<string, number>
  expenses: Record<string, number>
  /** 決算書に印刷されている合計。読み取った数字の足し算と突き合わせて、読み落としに気づくため。 */
  printed: { revenueTotal: number | null; expenseTotal: number | null; income: number | null }
  /** AIが自信を持てなかった科目のキー。確認画面で黄色くする。 */
  uncertain: string[]
  warnings: string[]
  source: string
}

export interface Assumptions {
  /** 売上の伸び（%/年）。0＝去年と同じ。 */
  revenueRate: number
  /** 資材費の上昇率（%/年）。 */
  materialRate: number
  /** 人件費の変化（%/年）。0＝固定。 */
  laborRate: number
  // ── 詳細設定 ──
  /** その他の経費の上昇率（%/年）。 */
  otherRate: number
  /** 箱代の値上げ: 1年に使う箱の数 × 1箱あたりの値上げ額（円）。翌年から毎年かかる。 */
  boxCount: number
  boxPriceUp: number
  /** 科目ごとの上昇率の上書き（%/年）。未設定ならグループの率を使う。 */
  itemRates: Record<string, number>
  /** 出発点にする年（確定済みの年から選ぶ）。null＝確定済みのうち最新。 */
  baseYear: number | null
}

/** AIが出した初期値と、その理由。ユーザーが数字を変えても理由は残し、「AIの提案に戻す」に使う。 */
export interface AiSuggestion {
  revenueRate: number
  materialRate: number
  laborRate: number
  otherRate: number
  reasons: { revenue: string; material: string; labor: string; other: string }
  createdAt: string
}

export type StrategyKey = 'price' | 'labor' | 'supplier'

/** 対応策。value はいずれも %（単価を何%上げるか／人件費を何%削るか／資材費を何%下げるか）。 */
export interface Strategy {
  key: StrategyKey
  enabled: boolean
  value: number
  /** 何年目から効かせるか（1〜10）。 */
  startYear: number
}

export interface SimState {
  years: TaxYear[]
  assumptions: Assumptions
  strategies: Strategy[]
  ai: AiSuggestion | null
}

/** short はグラフの線の端に置く名前（幅が限られるので6字以内）。 */
export const STRATEGY_LABELS: Record<StrategyKey, { name: string; short: string; verb: string }> = {
  price: { name: '販売単価を上げる', short: '単価アップ', verb: '単価を上げる' },
  labor: { name: '人件費を見直す', short: '人件費削減', verb: '人件費を削る' },
  supplier: { name: '資材の仕入先を変える', short: '仕入先変更', verb: '資材費を下げる' },
}

export const SIM_YEARS = 10

export function defaultAssumptions(): Assumptions {
  return {
    revenueRate: 0,
    materialRate: 5,
    laborRate: 0,
    otherRate: 1,
    boxCount: 0,
    boxPriceUp: 0,
    itemRates: {},
    baseYear: null,
  }
}

export function defaultStrategies(): Strategy[] {
  return [
    { key: 'price', enabled: true, value: 5, startYear: 1 },
    { key: 'labor', enabled: false, value: 10, startYear: 1 },
    { key: 'supplier', enabled: false, value: 5, startYear: 1 },
  ]
}

export function emptyState(): SimState {
  return { years: [], assumptions: defaultAssumptions(), strategies: defaultStrategies(), ai: null }
}

/** 決算書から読み取った下書き（extract API の戻り値）。id/status はクライアントで付ける。 */
export type TaxYearDraft = Omit<TaxYear, 'id' | 'status'>
