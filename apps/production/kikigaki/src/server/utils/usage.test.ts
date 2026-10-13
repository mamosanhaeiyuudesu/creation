import { describe, expect, it } from 'vitest'
import { budgetUnits, costUnits, toStatus } from './usage'

describe('costUnits', () => {
  it('入力$2・出力$10（100万トークンあたり）で費用を求める', () => {
    // 100万トークン入力 = $2 = 2,000万単位（1単位 = 10^-7 USD）
    expect(costUnits({ input_tokens: 1_000_000 })).toBe(20_000_000)
    expect(costUnits({ output_tokens: 1_000_000 })).toBe(100_000_000)
  })

  it('キャッシュの分も数える', () => {
    expect(costUnits({ cache_read_input_tokens: 1_000_000 })).toBe(2_000_000)
    expect(costUnits({ cache_creation_input_tokens: 1_000_000 })).toBe(25_000_000)
  })

  it('値が無ければ0', () => {
    expect(costUnits({})).toBe(0)
  })
})

describe('toStatus', () => {
  it('割合は切り捨てで出し、上限に達したら100・exhausted', () => {
    const b = budgetUnits()
    expect(toStatus(0, b)).toEqual({ usedPercent: 0, exhausted: false })
    expect(toStatus(Math.floor(b * 0.505), b)).toEqual({ usedPercent: 50, exhausted: false })
    expect(toStatus(b, b)).toEqual({ usedPercent: 100, exhausted: true })
    expect(toStatus(b * 3, b)).toEqual({ usedPercent: 100, exhausted: true })
  })
})
