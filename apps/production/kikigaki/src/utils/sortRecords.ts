// 一覧の並べ替え。サーバー／クライアント共用の純粋関数。

export type RecordSortKey = 'date' | 'created'
export type RecordSortOrder = 'desc' | 'asc'

interface Sortable {
  /** 会議の日（YYYY-MM-DD）。空のことがある */
  date: string
  /** 作った日時（D1 の datetime。YYYY-MM-DD HH:MM:SS） */
  createdAt: string
}

/**
 * 新しい順に並べる。
 *   - date: 会議の日の新しい順（既定）。会議の日が無いものは**先頭**にまとめ、その中は作った日の新しい順
 *     （日付が入っていない議事録は、入れ忘れに気づいて直せるよう目につく場所に出す。本人の指示 2026-10-18）
 *   - created: 作った日の新しい順
 * 同じ日どうしは、作った日の新しい順。元の配列は変えない。
 * order='asc' なら古い順（日が無いものは昇順でも先頭のまま＝入れ忘れに気づけるように）。
 */
export function sortRecords<T extends Sortable>(records: T[], key: RecordSortKey, order: RecordSortOrder = 'desc'): T[] {
  const sign = order === 'asc' ? -1 : 1
  const byCreated = (a: T, b: T) => sign * (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  if (key === 'created') return [...records].sort(byCreated)
  return [...records].sort((a, b) => {
    if (!a.date && !b.date) return byCreated(a, b)
    if (!a.date) return -1
    if (!b.date) return 1
    return sign * b.date.localeCompare(a.date) || byCreated(a, b)
  })
}

/** URL の ?order= を読む。知らない値は既定（新しい順） */
export function parseSortOrder(value: unknown): RecordSortOrder {
  return value === 'asc' ? 'asc' : 'desc'
}

/** URL の ?sort= を読む。知らない値は既定（会議の日） */
export function parseSortKey(value: unknown): RecordSortKey {
  return value === 'created' ? 'created' : 'date'
}
