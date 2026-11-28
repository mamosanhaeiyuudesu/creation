// 日記のAI振り返りの期間と種類（画面とAPIで共用）。

/** 振り返りの種類（＝使うプロンプト）。label はセレクトボックスの表示名 */
export const NIKKI_REVIEW_KINDS = [
  { id: 'progress', label: '前に進んだこと' },
  { id: 'trend', label: '時系列の変化分析' },
] as const

export type NikkiReviewKindId = (typeof NIKKI_REVIEW_KINDS)[number]['id']
export const NIKKI_REVIEW_DEFAULT_KIND: NikkiReviewKindId = 'progress'

export function isNikkiReviewKindId(v: unknown): v is NikkiReviewKindId {
  return NIKKI_REVIEW_KINDS.some((k) => k.id === v)
}

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
