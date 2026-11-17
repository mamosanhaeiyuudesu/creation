// 日記のAI振り返りの期間（画面とAPIで共用）。

export const NIKKI_REVIEW_RANGES = [
  { id: '1w', label: '1週間', days: 7 },
  { id: 'all', label: '全期間', days: 0 },
] as const

export type NikkiReviewRangeId = (typeof NIKKI_REVIEW_RANGES)[number]['id']
export const NIKKI_REVIEW_DEFAULT_RANGE: NikkiReviewRangeId = '1w'

export function isNikkiReviewRangeId(v: unknown): v is NikkiReviewRangeId {
  return NIKKI_REVIEW_RANGES.some((r) => r.id === v)
}

/** "YYYY-MM-DD" に日数を足す（負で引く） */
export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
