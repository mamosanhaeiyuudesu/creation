// farm-simulation の10年試算。サーバーを通さず画面で即時に再計算するため、純TSで持つ。
// 正確な数字を打ち出す会計ではなく「前提を変えたら利益がどう動くか」をつかむための計算なので、
// 複利の上昇率をかけるだけの単純なモデルに留める（細かくすると前提の数が増えて触られなくなる）。
import {
  EXPENSE_ITEMS,
  REVENUE_ITEMS,
  SIM_YEARS,
  STRATEGY_LABELS,
} from '../types/farm-simulation'
import type { Assumptions, ExpenseGroup, SimState, Strategy, StrategyKey, TaxYear } from '../types/farm-simulation'

export interface YearRow {
  /** 0＝出発点（確定申告の実績）、1〜10＝何年後か */
  t: number
  year: number
  revenue: number
  material: number
  labor: number
  depreciation: number
  other: number
  expense: number
  profit: number
}

export interface Scenario {
  id: 'base' | StrategyKey | 'all'
  label: string
  /** グラフの線の端に置く短い名前 */
  short: string
  rows: YearRow[]
}

export function sumValues(rec: Record<string, number>): number {
  return Object.values(rec).reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0)
}

export function yearRevenue(y: TaxYear): number {
  return REVENUE_ITEMS.reduce((s, d) => s + (y.revenue[d.key] ?? 0), 0)
}

export function yearExpense(y: TaxYear): number {
  return EXPENSE_ITEMS.reduce((s, d) => s + (y.expenses[d.key] ?? 0), 0)
}

/** 青色申告特別控除前の所得に相当する「利益」。棚卸しの増減・育成費用は含めない（前年並みで消える前提）。 */
export function yearProfit(y: TaxYear): number {
  return yearRevenue(y) - yearExpense(y)
}

/** 出発点にする年。指定が無い／見つからなければ確定済みのうち最新。 */
export function pickBaseYear(years: TaxYear[], baseYear: number | null): TaxYear | null {
  const confirmed = years.filter((y) => y.status === 'confirmed').sort((a, b) => b.year - a.year)
  if (!confirmed.length) return null
  return confirmed.find((y) => y.year === baseYear) ?? confirmed[0]!
}

function grow(amount: number, ratePct: number, t: number): number {
  return amount * Math.pow(1 + ratePct / 100, t)
}

function groupRate(a: Assumptions, group: ExpenseGroup): number {
  if (group === 'material') return a.materialRate
  if (group === 'labor') return a.laborRate
  if (group === 'other') return a.otherRate
  return 0 // 減価償却費は毎年同じ額
}

/** 1本の線（ある対応策の組み合わせ）を計算する。active に入っている対応策だけを効かせる。 */
export function project(base: TaxYear, a: Assumptions, active: Strategy[]): YearRow[] {
  const on = (key: StrategyKey, t: number): number => {
    const s = active.find((x) => x.key === key)
    return s && t >= s.startYear ? s.value / 100 : 0
  }
  const rows: YearRow[] = []
  for (let t = 0; t <= SIM_YEARS; t++) {
    // 販売金額・家事消費は売上の伸びに乗せる。雑収入（補助金など）は読めないので据え置き。
    let revenue = 0
    for (const d of REVENUE_ITEMS) {
      const v = base.revenue[d.key] ?? 0
      if (d.key === 'misc') revenue += v
      else if (d.key === 'sales') revenue += grow(v, a.revenueRate, t) * (1 + on('price', t))
      else revenue += grow(v, a.revenueRate, t)
    }

    const groups: Record<ExpenseGroup, number> = { material: 0, labor: 0, depreciation: 0, other: 0 }
    for (const d of EXPENSE_ITEMS) {
      const v = base.expenses[d.key] ?? 0
      if (!v) continue
      const g = d.group ?? 'other'
      const rate = a.itemRates[d.key] ?? groupRate(a, g)
      groups[g] += t === 0 ? v : grow(v, rate, t)
    }
    if (t > 0) {
      groups.material *= 1 - on('supplier', t)
      groups.labor *= 1 - on('labor', t)
      // 箱代の値上げは「1箱いくら上がるか」の絶対額。上昇率とは別に翌年から毎年上乗せする。
      groups.material += Math.max(0, a.boxCount) * a.boxPriceUp
    }

    const expense = groups.material + groups.labor + groups.depreciation + groups.other
    rows.push({
      t,
      year: base.year + t,
      revenue: Math.round(revenue),
      material: Math.round(groups.material),
      labor: Math.round(groups.labor),
      depreciation: Math.round(groups.depreciation),
      other: Math.round(groups.other),
      expense: Math.round(expense),
      profit: Math.round(revenue - expense),
    })
  }
  return rows
}

/**
 * 画面に重ねる線の一覧。現状のまま／有効な対応策それぞれ単独／2つ以上有効なら全部あわせて。
 * 対応策ごとに単独の線を出すのは「どれがいちばん効くか」を並べて比べるため（仕様の経営判断の比較）。
 */
export function simulate(state: SimState): { base: TaxYear | null; scenarios: Scenario[] } {
  const base = pickBaseYear(state.years, state.assumptions.baseYear)
  if (!base) return { base: null, scenarios: [] }
  const a = state.assumptions
  const enabled = state.strategies.filter((s) => s.enabled && s.value !== 0)
  const scenarios: Scenario[] = [{ id: 'base', label: '何もしない', short: '何もしない', rows: project(base, a, []) }]
  for (const s of enabled) {
    scenarios.push({ id: s.key, label: STRATEGY_LABELS[s.key].name, short: STRATEGY_LABELS[s.key].short, rows: project(base, a, [s]) })
  }
  if (enabled.length >= 2) scenarios.push({ id: 'all', label: '全部やる', short: '全部やる', rows: project(base, a, enabled) })
  return { base, scenarios }
}

/** 利益が初めて threshold を下回る「何年後」。下回らなければ null。 */
export function firstYearBelow(rows: YearRow[], threshold: number): number | null {
  const hit = rows.find((r) => r.t > 0 && r.profit < threshold)
  return hit ? hit.t : null
}

/** 農家が普段使う「万円」で見せる。1000万円未満は小数1桁まで（桃の箱代のような細かい差も消えないように）。 */
export function formatMan(yen: number): string {
  const man = yen / 10_000
  const abs = Math.abs(man)
  const s = abs >= 1000 ? Math.round(abs).toLocaleString('ja-JP') : (Math.round(abs * 10) / 10).toLocaleString('ja-JP')
  return `${man < 0 ? '▲' : ''}${s}万円`
}

export function formatYen(yen: number): string {
  return `${yen < 0 ? '▲' : ''}${Math.abs(Math.round(yen)).toLocaleString('ja-JP')}円`
}
