import { describe, expect, it } from 'vitest'
import { deleteAfterFrom, deleteAfterLabel, isDeletionDue, toSqlDateTime, withdrawnKindOf } from './withdrawal'

describe('deleteAfterFrom', () => {
  it('予約した日の30日後にする', () => {
    expect(deleteAfterFrom(new Date('2026-10-21T03:04:05Z'))).toBe('2026-11-20 03:04:05')
  })

  it('月をまたいでも日数どおりに数える', () => {
    expect(deleteAfterFrom(new Date('2026-12-15T00:00:00Z'))).toBe('2027-01-14 00:00:00')
  })

  it('日数を変えられる', () => {
    expect(deleteAfterFrom(new Date('2026-10-21T00:00:00Z'), 7)).toBe('2026-10-28 00:00:00')
  })
})

describe('isDeletionDue', () => {
  const now = new Date('2026-11-20T00:00:00Z')
  it('削除予定日を過ぎていれば true', () => {
    expect(isDeletionDue('2026-11-19 23:59:59', now)).toBe(true)
    expect(isDeletionDue('2026-11-20 00:00:00', now)).toBe(true)
  })
  it('予定日の前なら false', () => {
    expect(isDeletionDue('2026-11-20 00:00:01', now)).toBe(false)
  })
  it('お休み（予定日なし）・読めないときは false（消す方向に倒さない）', () => {
    expect(isDeletionDue('', now)).toBe(false)
    expect(isDeletionDue('でたらめ', now)).toBe(false)
  })
})

describe('withdrawnKindOf', () => {
  it('削除予定日があれば削除予約中、なければお休み', () => {
    expect(withdrawnKindOf('2026-11-20 00:00:00')).toBe('scheduled')
    expect(withdrawnKindOf('')).toBe('rest')
  })
})

describe('deleteAfterLabel', () => {
  it('JST の日付にする（UTC の夜は翌日になる）', () => {
    expect(deleteAfterLabel('2026-11-19 16:00:00')).toBe('2026年11月20日')
  })
  it('読めなければ空', () => {
    expect(deleteAfterLabel('')).toBe('')
  })
})

describe('toSqlDateTime', () => {
  it('D1 の datetime(now) と同じ形にする', () => {
    expect(toSqlDateTime(new Date('2026-01-02T03:04:05Z'))).toBe('2026-01-02 03:04:05')
  })
})
