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
