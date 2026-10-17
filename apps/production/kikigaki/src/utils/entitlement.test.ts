import { describe, expect, it } from 'vitest'
import { canUseFeatures, isTrialEligible, parseAdminIds, parseMonitorMode } from './entitlement'

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
    expect(canUseFeatures({ monitorMode: false, status: 'incomplete' })).toBe(false)
    expect(canUseFeatures({ monitorMode: false, status: 'unpaid' })).toBe(false)
  })

  it('引き落としに失敗して請求し直している間（past_due）は、猶予として使える', () => {
    expect(canUseFeatures({ monitorMode: false, status: 'past_due' })).toBe(true)
  })

  it('運営者が支払い不要にした人（管理者を含む）は、契約が無くても使える', () => {
    expect(canUseFeatures({ monitorMode: false, status: '', freeAccess: true })).toBe(true)
    expect(canUseFeatures({ monitorMode: false, status: 'canceled', freeAccess: true })).toBe(true)
    expect(canUseFeatures({ monitorMode: false, status: '', freeAccess: false })).toBe(false)
  })
})

describe('parseAdminIds', () => {
  it('カンマ区切りを読み、空白と空要素を落とす', () => {
    expect(parseAdminIds(' uid-a , uid-b,,')).toEqual(['uid-a', 'uid-b'])
  })

  it('未設定なら管理者はいない', () => {
    expect(parseAdminIds(undefined)).toEqual([])
    expect(parseAdminIds('')).toEqual([])
  })
})

describe('isTrialEligible', () => {
  it('一度も契約したことがない人にだけ無料期間を付ける', () => {
    expect(isTrialEligible({ trialDays: 30, subscriptionId: '' })).toBe(true)
    expect(isTrialEligible({ trialDays: 30, subscriptionId: 'sub_123' })).toBe(false)
    expect(isTrialEligible({ trialDays: 0, subscriptionId: '' })).toBe(false)
  })
})
