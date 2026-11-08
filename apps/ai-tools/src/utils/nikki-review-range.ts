// 日記のAI振り返りの期間（画面とAPIで共用）。

export const NIKKI_REVIEW_RANGES = [
  { id: '1w', label: '1週間', days: 7 },
  { id: '2w', label: '2週間', days: 14 },
  { id: '1m', label: '1ヶ月', days: 30 },
  { id: '3m', label: '3ヶ月', days: 91 },
  { id: '6m', label: '半年', days: 182 },
  { id: '1y', label: '1年', days: 365 },
  { id: 'all', label: '全期間', days: 0 },
  { id: 'custom', label: '自由選択', days: 0 },
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
