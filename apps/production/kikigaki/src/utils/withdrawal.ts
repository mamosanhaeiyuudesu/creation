// 退会（お休み）の保存期間まわりの純粋関数。サーバー／クライアント共用。
//
// 退会には2種類ある。
//   - お休み: 議事録などを残したまま使えなくする。退会の日から RETENTION_YEARS 年のあいだ預かり、
//     期間内にログインして「再開」すれば元どおりに使える。
//   - すべて消す: その場ですべて削除する（server/utils/account.ts の deleteAccount）。
// 日時は D1 の datetime('now') と同じ UTC の「YYYY-MM-DD HH:MM:SS」で持つ。

/** お休み中のデータを預かる年数。規約・プライバシーポリシーの文面もこの数字に合わせる */
export const RETENTION_YEARS = 5

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Date → D1 の datetime('now') と同じ形（UTC）の文字列 */
export function toSqlDateTime(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
}

/** 「YYYY-MM-DD HH:MM:SS」(UTC) → Date。読めなければ null */
export function parseSqlDateTime(s: string): Date | null {
  if (!s) return null
  const d = new Date(`${s.replace(' ', 'T')}Z`)
  return Number.isNaN(d.getTime()) ? null : d
}

/**
 * 預かる期限。退会の日の RETENTION_YEARS 年後。
 * 2月29日に退会した場合、翌年が平年でも3月1日にずれて期間が短くならないよう、月末側に丸める。
 */
export function retainUntilFrom(withdrawnAt: Date, years: number = RETENTION_YEARS): string {
  const y = withdrawnAt.getUTCFullYear() + years
  const m = withdrawnAt.getUTCMonth()
  const day = withdrawnAt.getUTCDate()
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  const until = new Date(
    Date.UTC(y, m, Math.min(day, lastDay), withdrawnAt.getUTCHours(), withdrawnAt.getUTCMinutes(), withdrawnAt.getUTCSeconds())
  )
  return toSqlDateTime(until)
}

/** 預かる期限を過ぎているか。期限が読めない（空など）ときは過ぎていないものとして扱う（消す方向に倒さない） */
export function isRetentionExpired(retainUntil: string, now: Date = new Date()): boolean {
  const until = parseSqlDateTime(retainUntil)
  return !!until && until.getTime() <= now.getTime()
}

/** 画面に出す期限の日付（JST の「2031年10月20日」） */
export function retainUntilLabel(retainUntil: string): string {
  const until = parseSqlDateTime(retainUntil)
  if (!until) return ''
  const j = new Date(until.getTime() + 9 * 60 * 60 * 1000)
  return `${j.getUTCFullYear()}年${j.getUTCMonth() + 1}月${j.getUTCDate()}日`
}
