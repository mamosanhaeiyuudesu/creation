import { describe, expect, it } from 'vitest'
import { canUseFeatures, parseMonitorMode } from './entitlement'

describe('parseMonitorMode', () => {
  it('"false" のときだけ有料モードになる', () => {
    expect(parseMonitorMode('false')).toBe(false)
    expect(parseMonitorMode(false)).toBe(false)
  })

  it('それ以外はモニター期間（無料）として扱う', () => {
    expect(parseMonitorMode('true')).toBe(true)
    expect(parseMonitorMode(true)).toBe(true)
    // 設定し忘れ・打ち間違いでお客さんを止めてしまわないよう、無料側へ倒す
    expect(parseMonitorMode(undefined)).toBe(true)
    expect(parseMonitorMode('')).toBe(true)
    expect(parseMonitorMode('FALSE')).toBe(true)
  })
})

describe('canUseFeatures', () => {
  it('モニター期間中は契約が無くても使える', () => {
    expect(canUseFeatures({ monitorMode: true, status: '' })).toBe(true)
    expect(canUseFeatures({ monitorMode: true, status: 'canceled' })).toBe(true)
  })

  it('有料モードでは契約が有効なときだけ使える', () => {
    expect(canUseFeatures({ monitorMode: false, status: 'active' })).toBe(true)
    expect(canUseFeatures({ monitorMode: false, status: 'trialing' })).toBe(true)
    expect(canUseFeatures({ monitorMode: false, status: '' })).toBe(false)
    expect(canUseFeatures({ monitorMode: false, status: 'canceled' })).toBe(false)
    expect(canUseFeatures({ monitorMode: false, status: 'past_due' })).toBe(false)
    expect(canUseFeatures({ monitorMode: false, status: 'incomplete' })).toBe(false)
  })
})
