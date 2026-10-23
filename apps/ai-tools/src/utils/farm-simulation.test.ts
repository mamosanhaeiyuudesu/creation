import { describe, expect, it } from 'vitest'
import { firstYearBelow, project, simulate } from './farm-simulation'
import { defaultAssumptions, defaultStrategies } from '../types/farm-simulation'
import type { SimState, TaxYear } from '../types/farm-simulation'

function year(overrides: Partial<TaxYear> = {}): TaxYear {
  return {
    id: 'y',
    year: 2025,
    status: 'confirmed',
    revenue: { sales: 10_000_000, homeUse: 0, misc: 0 },
    expenses: { fertilizer: 2_000_000, materials: 2_000_000, wages: 2_000_000, depreciation: 1_000_000 },
    printed: { revenueTotal: null, expenseTotal: null, income: null },
    uncertain: [],
    warnings: [],
    source: '',
    ...overrides,
  }
}

describe('project', () => {
  it('出発点は実績そのまま', () => {
    const rows = project(year(), defaultAssumptions(), [])
    expect(rows[0]).toMatchObject({ t: 0, year: 2025, revenue: 10_000_000, expense: 7_000_000, profit: 3_000_000 })
    expect(rows).toHaveLength(11)
  })

  it('資材費だけが毎年5%ずつ上がり、人件費と減価償却費は据え置き', () => {
    const a = { ...defaultAssumptions(), materialRate: 5, laborRate: 0, otherRate: 0 }
    const rows = project(year(), a, [])
    expect(rows[1]!.material).toBe(4_200_000)
    expect(rows[1]!.labor).toBe(2_000_000)
    expect(rows[1]!.depreciation).toBe(1_000_000)
    expect(rows[10]!.material).toBe(Math.round(4_000_000 * 1.05 ** 10))
  })

  it('単価アップは開始年から販売金額にだけ効く', () => {
    const a = { ...defaultAssumptions(), materialRate: 0 }
    const rows = project(year({ revenue: { sales: 10_000_000, misc: 500_000 } }), a, [
      { key: 'price', enabled: true, value: 10, startYear: 3 },
    ])
    expect(rows[2]!.revenue).toBe(10_500_000)
    expect(rows[3]!.revenue).toBe(11_500_000)
  })

  it('箱代の値上げは箱数×値上げ額を翌年から上乗せする', () => {
    const a = { ...defaultAssumptions(), materialRate: 0, boxCount: 3000, boxPriceUp: 100 }
    const rows = project(year(), a, [])
    expect(rows[0]!.material).toBe(4_000_000)
    expect(rows[1]!.material).toBe(4_300_000)
  })

  it('科目ごとの上書きはグループの率より優先される', () => {
    const a = { ...defaultAssumptions(), materialRate: 0, itemRates: { fertilizer: 10 } }
    expect(project(year(), a, [])[1]!.material).toBe(4_200_000)
  })
})

describe('simulate', () => {
  it('確定済みの年が無ければ線は出ない', () => {
    const state: SimState = { years: [year({ status: 'draft' })], assumptions: defaultAssumptions(), strategies: defaultStrategies(), ai: null }
    expect(simulate(state).scenarios).toEqual([])
  })

  it('対応策が2つ以上有効なら「全部やる」の線が足される', () => {
    const strategies = defaultStrategies().map((s) => ({ ...s, enabled: true }))
    const state: SimState = { years: [year()], assumptions: defaultAssumptions(), strategies, ai: null }
    expect(simulate(state).scenarios.map((s) => s.id)).toEqual(['base', 'price', 'labor', 'supplier', 'all'])
  })

  it('出発点は確定済みのうち最新の年', () => {
    const state: SimState = {
      years: [year({ id: 'a', year: 2023 }), year({ id: 'b', year: 2024 }), year({ id: 'c', year: 2025, status: 'draft' })],
      assumptions: defaultAssumptions(),
      strategies: [],
      ai: null,
    }
    expect(simulate(state).base?.year).toBe(2024)
  })
})

describe('firstYearBelow', () => {
  it('資材費が上がり続けると何年後に赤字になるか', () => {
    const a = { ...defaultAssumptions(), materialRate: 10, otherRate: 0 }
    const rows = project(year(), a, [])
    expect(firstYearBelow(rows, 0)).toBe(6)
  })
})
