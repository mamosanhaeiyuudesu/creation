// 日付の表示。サーバー／クライアント共用の純粋関数（テストしやすいようにここへ切り出す）。

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** "2026-10-07" → "2026年10月7日(水)"。形が違えばそのまま返す */
export function formatDateLabel(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return dateStr
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日(${WEEKDAYS[d.getDay()]})`
}

/**
 * 一覧に出す日付。会議の日付が分かっていればそれを出し、
 * 分からなければ「作った日」を出す（日付が空欄のまま並ぶと、どれがどれだか分からなくなる）。
 */
export function formatMeetingDate(date: string, createdAt: string): string {
  if (date) return formatDateLabel(date)
  const ymd = (createdAt ?? '').slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return `${formatDateLabel(ymd)}につくりました`
  return '日付が入っていません'
}

/** JST の「YYYY-MM」。月間の利用量の集計キー（月の区切りを日本時間に合わせる） */
export function jstYearMonth(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  return `${jst.getUTCFullYear()}-${m}`
}

/** JST の「YYYY-MM-DD」。AIへ「今日」を伝えるときに使う */
export function jstToday(now: Date = new Date()): string {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(jst.getUTCDate()).padStart(2, '0')
  return `${jst.getUTCFullYear()}-${m}-${d}`
}
