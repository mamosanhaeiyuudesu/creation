const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 現在時刻を JST として表した Date（UTC getter で JST 値を読む） */
export function nowJST(): Date {
  return new Date(Date.now() + JST_OFFSET_MS)
}

/** 今日の JST 日付文字列（YYYY-MM-DD） */
export function todayJST(): string {
  return nowJST().toISOString().slice(0, 10)
}

/** 現在の JST 年 */
export function currentYearJST(): number {
  return parseInt(nowJST().toISOString().slice(0, 4), 10)
}

export const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土'] as const

/** "YYYY-MM-DD" の曜日（"月" など単一文字） */
export function weekdayJa(ymd: string): string {
  return WEEKDAYS_JA[new Date(`${ymd}T00:00:00Z`).getUTCDay()]
}

/** "YYYY-MM-DD" を "M/D(曜)" 形式に整形（グラフの日付ラベル用） */
export function mdWeekday(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${WEEKDAYS_JA[d.getUTCDay()]})`
}

/** 分 → "X時間Y分"（0時間なら "Y分"）。 */
export function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

/** タイムゾーン指定のない日時文字列か（例: SQLiteの datetime('now') が返す "YYYY-MM-DD HH:MM:SS"） */
function hasNoTimezone(s: string): boolean {
  return !/[Zz]$|[+-]\d{2}:?\d{2}$/.test(s.trim())
}

/** ISO 文字列または Date を JST にシフトした Date（UTC getter で JST 値を読む） */
export function toJSTDate(iso: string | Date): Date {
  // タイムゾーン指定のない文字列はUTCとして明示的に解釈する（未指定だとブラウザのローカルTZで解釈され二重ズレが起きるため）
  const normalized = typeof iso === 'string' && hasNoTimezone(iso) ? `${iso.replace(' ', 'T')}Z` : iso
  const ms = typeof normalized === 'string' ? new Date(normalized).getTime() : normalized.getTime()
  return new Date(ms + JST_OFFSET_MS)
}
