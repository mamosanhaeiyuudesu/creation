// nikki のカレンダー表示のための純粋関数（月のマス組み・予定の日付割り付け）。
// 表示側とタイムライン側の両方から使うので、コンポーネントの中に埋めずここに置く。

import { toJSTDate, WEEKDAYS_JA } from '~/utils/jst'
import type { NikkiEvent } from '~/types/nikki'

export { WEEKDAYS_JA }

/** "YYYY-MM-DD" を1日進める */
export function nextDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** 予定の開始日（JST基準の YYYY-MM-DD）。終日予定は date、時刻ありは dateTime から取る。 */
export function eventDate(value: string): string {
  if (!value) return ''
  // 終日予定は最初から YYYY-MM-DD で来るので、そのまま使う（タイムゾーン換算しない）
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  return toJSTDate(value).toISOString().slice(0, 10)
}

/**
 * 予定を日付ごとに束ねる。
 * 終日予定の end は「翌日」（排他）なので、start から end の前日までの全ての日に置く
 * ＝旅行や連休の予定が初日にしか出ない、を避ける。
 */
export function groupEventsByDate(events: NikkiEvent[]): Record<string, NikkiEvent[]> {
  const map: Record<string, NikkiEvent[]> = {}
  const push = (date: string, ev: NikkiEvent) => {
    if (!date) return
    if (map[date]) map[date]!.push(ev)
    else map[date] = [ev]
  }

  for (const ev of events) {
    const start = eventDate(ev.start)
    if (!ev.allDay) {
      push(start, ev)
      continue
    }
    const endExclusive = eventDate(ev.end) || nextDate(start)
    // 念のため上限を付ける（終日予定の end が壊れていても無限ループにしない）
    let cursor = start
    for (let i = 0; i < 60 && cursor && cursor < endExclusive; i++) {
      push(cursor, ev)
      cursor = nextDate(cursor)
    }
    if (start >= endExclusive) push(start, ev)
  }

  for (const date of Object.keys(map)) {
    // 終日を先に、あとは開始時刻順（カレンダーのマスでも詳細でも同じ並び）
    map[date]!.sort((a, b) => (a.allDay === b.allDay ? a.start.localeCompare(b.start) : a.allDay ? -1 : 1))
  }
  return map
}

export interface MonthGrid {
  /** 月初の曜日ぶんの空きマス数（日曜始まり） */
  offset: number
  /** その月の日数 */
  days: number
  /** 各日の "YYYY-MM-DD" */
  dates: string[]
  year: number
  month: number
}

/** "YYYY-MM" から月表示のマス組みを作る */
export function monthGrid(month: string): MonthGrid {
  const [y, m] = month.split('-').map(Number)
  const year = y || new Date().getUTCFullYear()
  const mon = m || 1
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate()
  const offset = new Date(Date.UTC(year, mon - 1, 1)).getUTCDay()
  const dates = Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)
  return { offset, days, dates, year, month: mon }
}

/** 時刻ありの予定を "H:MM" で。終日は空文字。 */
export function eventTime(ev: NikkiEvent): string {
  if (ev.allDay || !ev.start) return ''
  const d = toJSTDate(ev.start)
  return `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

/** "YYYY-MM-DD" → "M月D日(曜)" */
export function formatDateLabel(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}月${d.getUTCDate()}日(${WEEKDAYS_JA[d.getUTCDay()]})`
}

/** "YYYY-MM-DD" → "M/D"（タイムラインの見出し用） */
export function formatShortDate(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
}
