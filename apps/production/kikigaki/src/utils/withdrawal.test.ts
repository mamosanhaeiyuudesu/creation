import { describe, expect, it } from 'vitest'
import { isRetentionExpired, retainUntilFrom, retainUntilLabel, toSqlDateTime } from './withdrawal'

describe('retainUntilFrom', () => {
  it('退会の日の5年後にする', () => {
    expect(retainUntilFrom(new Date('2026-10-20T03:04:05Z'))).toBe('2031-10-20 03:04:05')
  })

  it('うるう日に退会しても、期間が短くならないよう月末に丸める', () => {
    expect(retainUntilFrom(new Date('2028-02-29T00:00:00Z'))).toBe('2033-02-28 00:00:00')
  })

  it('年数を変えられる', () => {
    expect(retainUntilFrom(new Date('2026-10-20T00:00:00Z'), 1)).toBe('2027-10-20 00:00:00')
  })
})

describe('isRetentionExpired', () => {
  const now = new Date('2031-10-20T00:00:00Z')
  it('期限を過ぎていれば true', () => {
    expect(isRetentionExpired('2031-10-19 23:59:59', now)).toBe(true)
    expect(isRetentionExpired('2031-10-20 00:00:00', now)).toBe(true)
  })
  it('期限前なら false', () => {
    expect(isRetentionExpired('2031-10-20 00:00:01', now)).toBe(false)
  })
  it('期限が空・読めないときは false（消す方向に倒さない）', () => {
    expect(isRetentionExpired('', now)).toBe(false)
    expect(isRetentionExpired('でたらめ', now)).toBe(false)
  })
})

describe('retainUntilLabel', () => {
  it('JST の日付にする（UTC の夜は翌日になる）', () => {
    expect(retainUntilLabel('2031-10-19 16:00:00')).toBe('2031年10月20日')
  })
  it('読めなければ空', () => {
    expect(retainUntilLabel('')).toBe('')
  })
})

describe('toSqlDateTime', () => {
  it('D1 の datetime(now) と同じ形にする', () => {
    expect(toSqlDateTime(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02 03:04:05')
  })
})
