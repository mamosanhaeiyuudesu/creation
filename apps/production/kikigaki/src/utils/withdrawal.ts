// 退会まわりの純粋関数。サーバー／クライアント共用。
//
// 退会には3つの道がある。
//   - お休み: 議事録などを残したまま使えなくする。**期限なし**（本人が消すまで預かる）。再開すれば元どおり。
//   - すべて消してやめる: 削除を予約する。DELETION_GRACE_DAYS 日のあいだは取り消せて、過ぎたら管理画面から消す。
//   - 今すぐ消す: その場で全部消す（元に戻せない）。
// お休みと削除予約は「使えないが、データは持っている」点が同じで、違いは削除予定日（users.delete_after）の有無だけ。
// 日時は D1 の datetime('now') と同じ UTC の「YYYY-MM-DD HH:MM:SS」で持つ。

/** 「すべて消してやめる」を選んでから、実際に消すまでの猶予（日）。規約・プライバシーポリシーの文面もこの数字に合わせる */
export const DELETION_GRACE_DAYS = 30

/** 退会中の状態。rest＝お休み（期限なし）、scheduled＝削除予約中 */
export type WithdrawnKind = 'rest' | 'scheduled'

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

/** 削除予定日。予約した日の DELETION_GRACE_DAYS 日後 */
export function deleteAfterFrom(scheduledAt: Date, days: number = DELETION_GRACE_DAYS): string {
  return toSqlDateTime(new Date(scheduledAt.getTime() + days * 24 * 60 * 60 * 1000))
}

/** 退会中の種類。削除予定日があれば削除予約中、なければお休み */
export function withdrawnKindOf(deleteAfter: string): WithdrawnKind {
  return deleteAfter ? 'scheduled' : 'rest'
}

/**
 * 削除予定日を過ぎているか。削除予定日が無い（お休み）や読めないときは過ぎていないものとして扱う
 * （消す方向に倒さない）。
 */
export function isDeletionDue(deleteAfter: string, now: Date = new Date()): boolean {
  const until = parseSqlDateTime(deleteAfter)
  return !!until && until.getTime() <= now.getTime()
}

/** 画面に出す削除予定日（JST の「2026年11月20日」） */
export function deleteAfterLabel(deleteAfter: string): string {
  const until = parseSqlDateTime(deleteAfter)
  if (!until) return ''
  const j = new Date(until.getTime() + 9 * 60 * 60 * 1000)
  return `${j.getUTCFullYear()}年${j.getUTCMonth() + 1}月${j.getUTCDate()}日`
}
