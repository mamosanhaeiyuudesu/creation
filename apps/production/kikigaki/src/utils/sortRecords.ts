// 一覧の並べ替え。サーバー／クライアント共用の純粋関数。

export type RecordSortKey = 'date' | 'created'

interface Sortable {
  /** 会議の日（YYYY-MM-DD）。空のことがある */
  date: string
  /** つくった日時（D1 の datetime。YYYY-MM-DD HH:MM:SS） */
  createdAt: string
}

/**
 * 新しい順に並べる。
 *   - date: 会議の日の新しい順（既定）。会議の日が無いものは**先頭**にまとめ、その中はつくった日の新しい順
 *     （日付が入っていない議事録は、入れ忘れに気づいて直せるよう目につく場所に出す。本人の指示 2026-10-18）
 *   - created: つくった日の新しい順
 * 同じ日どうしは、つくった日の新しい順。元の配列は変えない。
 */
export function sortRecords<T extends Sortable>(records: T[], key: RecordSortKey): T[] {
  const byCreated = (a: T, b: T) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
  if (key === 'created') return [...records].sort(byCreated)
  return [...records].sort((a, b) => {
    if (!a.date && !b.date) return byCreated(a, b)
    if (!a.date) return -1
    if (!b.date) return 1
    return b.date.localeCompare(a.date) || byCreated(a, b)
  })
}

/** URL の ?sort= を読む。知らない値は既定（会議の日） */
export function parseSortKey(value: unknown): RecordSortKey {
  return value === 'created' ? 'created' : 'date'
}
