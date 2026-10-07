import { describe, expect, it } from 'vitest'
import { formatDateLabel, formatMeetingDate, jstToday, jstYearMonth } from './formatDate'

describe('formatDateLabel', () => {
  it('曜日を付けて日本語にする', () => {
    expect(formatDateLabel('2026-10-07')).toBe('2026年10月7日(水)')
  })

  it('形が違えばそのまま返す', () => {
    expect(formatDateLabel('')).toBe('')
    expect(formatDateLabel('2026/10/07')).toBe('2026/10/07')
  })
})

describe('formatMeetingDate', () => {
  it('会議の日付があればそれを出す', () => {
    expect(formatMeetingDate('2026-10-07', '2026-10-08 01:00:00')).toBe('2026年10月7日(水)')
  })

  it('会議の日付が空なら、つくった日を出す（日付なしの行が並ぶのを防ぐ）', () => {
    expect(formatMeetingDate('', '2026-10-08 01:00:00')).toBe('2026年10月8日(木)につくりました')
  })

  it('どちらも無ければ、入っていないことを書く', () => {
    expect(formatMeetingDate('', '')).toBe('日付が入っていません')
  })
})

describe('jstYearMonth', () => {
  it('JST で月を区切る（UTCでは前月でも、JSTで翌月なら翌月）', () => {
    // 2026-10-31 16:00 UTC = 2026-11-01 01:00 JST
    expect(jstYearMonth(new Date('2026-10-31T16:00:00Z'))).toBe('2026-11')
    expect(jstYearMonth(new Date('2026-10-31T14:00:00Z'))).toBe('2026-10')
  })
})

describe('jstToday', () => {
  it('JST の日付を返す', () => {
    expect(jstToday(new Date('2026-10-07T15:30:00Z'))).toBe('2026-10-08')
    expect(jstToday(new Date('2026-10-07T14:30:00Z'))).toBe('2026-10-07')
  })
})
