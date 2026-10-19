import { describe, expect, it } from 'vitest'
import { parseSortKey, parseSortOrder, sortRecords } from './sortRecords'

const rows = [
  { id: 'a', date: '2026-10-01', createdAt: '2026-10-10 09:00:00' },
  { id: 'b', date: '', createdAt: '2026-10-12 09:00:00' },
  { id: 'c', date: '2026-10-05', createdAt: '2026-10-05 09:00:00' },
  { id: 'd', date: '', createdAt: '2026-10-01 09:00:00' },
  { id: 'e', date: '2026-10-05', createdAt: '2026-10-08 09:00:00' },
]
const ids = (list: { id: string }[]) => list.map((r) => r.id)

describe('sortRecords', () => {
  it('既定は会議の日の新しい順。日が無いものは先頭、同じ日はつくった日の新しい順', () => {
    expect(ids(sortRecords(rows, 'date'))).toEqual(['b', 'd', 'e', 'c', 'a'])
  })

  it('つくった日の新しい順にもできる', () => {
    expect(ids(sortRecords(rows, 'created'))).toEqual(['b', 'a', 'e', 'c', 'd'])
  })

  it('昇順にすると古い順。日が無いものは先頭のまま', () => {
    expect(ids(sortRecords(rows, 'date', 'asc'))).toEqual(['d', 'b', 'a', 'c', 'e'])
    expect(ids(sortRecords(rows, 'created', 'asc'))).toEqual(['d', 'c', 'e', 'a', 'b'])
  })

  it('元の配列は変えない', () => {
    const copy = [...rows]
    sortRecords(rows, 'date')
    expect(rows).toEqual(copy)
  })
})

describe('parseSortKey', () => {
  it('created 以外は既定（会議の日）', () => {
    expect(parseSortKey('created')).toBe('created')
    expect(parseSortKey('date')).toBe('date')
    expect(parseSortKey(undefined)).toBe('date')
    expect(parseSortKey('xxx')).toBe('date')
  })
})

describe('parseSortOrder', () => {
  it('asc 以外は新しい順', () => {
    expect(parseSortOrder('asc')).toBe('asc')
    expect(parseSortOrder('desc')).toBe('desc')
    expect(parseSortOrder(undefined)).toBe('desc')
  })
})
