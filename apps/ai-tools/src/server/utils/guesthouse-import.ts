// Booking.com等のメッセージスレッドをコピペした原文から、メッセージ本文と日時を機械的に復元するパーサー。
// 「誰の発言か」の判定はしない（それは guesthouse-ai.ts の classifyImportedMessages がAIで行う）。
//
// 実物の書式（コピペ結果）:
//   本文（複数行）
//   時刻(HH:MM)                        ← 直前の本文の時刻
//   （日付が変わる時だけ）日付の区切り行  ← 次の本文の日付
//   本文（複数行）
//   ...
// 日付の区切り行は3種類: 「YYYY年M月D日」（古い日付）/ 曜日1文字（直近1週間）/ 「今日」「昨日」。
// 最後のメッセージだけ時刻が付かず、代わりに「送信済み」等のステータス行で終わる。
import { nowJST, currentYearJST } from '~/utils/jst'

export interface ParsedThreadMessage {
  content: string
  createdAt: string // "YYYY-MM-DD HH:MM:SS"（UTC。guesthouse_messages.created_at の規約に合わせる）
}

interface DateYMD {
  y: number
  m: number
  d: number
}

const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/
const FULL_DATE_RE = /^(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日$/
const WEEKDAY_RE = /^([月火水木金土日])$/
const TODAY_RE = /^今日$/
const YESTERDAY_RE = /^昨日$/
const STATUS_RE = /^(送信済み|既読)$/
const WEEKDAY_INDEX: Record<string, number> = { 日: 0, 月: 1, 火: 2, 水: 3, 木: 4, 金: 5, 土: 6 }

function toUtcDate(d: DateYMD): Date {
  return new Date(Date.UTC(d.y, d.m - 1, d.d))
}

function fromUtcDate(d: Date): DateYMD {
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }
}

/** curDate（無ければ fallback）より後、直近1週間以内で targetDow（0=日〜6=土）に一致する日付を返す。 */
function resolveWeekday(curDate: DateYMD | null, targetDow: number, fallback: DateYMD): DateYMD {
  const base = toUtcDate(curDate ?? fallback)
  for (let add = 1; add <= 7; add++) {
    const d = new Date(base)
    d.setUTCDate(d.getUTCDate() + add)
    if (d.getUTCDay() === targetDow) return fromUtcDate(d)
  }
  return curDate ?? fallback
}

/** JSTの日時(y,m,d,hh,mm)を、DBの created_at 規約（UTC・"YYYY-MM-DD HH:MM:SS"）の文字列に変換する。 */
function jstToSql(d: DateYMD, hh: number, mm: number): string {
  const utcMs = Date.UTC(d.y, d.m - 1, d.d, hh, mm, 0) - 9 * 60 * 60 * 1000
  return new Date(utcMs).toISOString().slice(0, 19).replace('T', ' ')
}

/**
 * Booking.com のメッセージスレッドのコピペ原文から、メッセージ本文と日時（推定）を機械的に復元する。
 * 分割・日付復元はすべてここで完結させ、AIは使わない（発言者の分類だけ別途AIに任せる）。
 * 曖昧な部分（先頭メッセージの日付が不明、最終メッセージに時刻が付かない等）は妥当な近似で埋める。
 */
export function parseBookingThread(raw: string): ParsedThreadMessage[] {
  const lines = raw.replace(/\r\n?/g, '\n').split('\n')
  const now = nowJST()
  const today: DateYMD = { y: now.getUTCFullYear(), m: now.getUTCMonth() + 1, d: now.getUTCDate() }

  let curDate: DateYMD | null = null
  const rawMessages: { lines: string[]; time: { h: number; m: number } | null; date: DateYMD | null }[] = []
  let buf: string[] = []

  let i = 0
  while (i < lines.length) {
    const trimmed = lines[i].trim()
    const timeMatch = trimmed.match(TIME_RE)
    if (timeMatch) {
      // 時刻行は直前に溜めた本文の時刻。date は「その時点で確定していた日付」を使う（このあとの区切り行は次の本文用）。
      rawMessages.push({ lines: buf, time: { h: Number(timeMatch[1]), m: Number(timeMatch[2]) }, date: curDate })
      buf = []
      i++
      while (i < lines.length) {
        const t = lines[i].trim()
        const full = t.match(FULL_DATE_RE)
        const wd = t.match(WEEKDAY_RE)
        if (full) {
          curDate = { y: full[1] ? Number(full[1]) : currentYearJST(), m: Number(full[2]), d: Number(full[3]) }
          i++
        } else if (wd) {
          curDate = resolveWeekday(curDate, WEEKDAY_INDEX[wd[1]], today)
          i++
        } else if (TODAY_RE.test(t)) {
          curDate = today
          i++
        } else if (YESTERDAY_RE.test(t)) {
          const d = toUtcDate(today)
          d.setUTCDate(d.getUTCDate() - 1)
          curDate = fromUtcDate(d)
          i++
        } else {
          break
        }
      }
      continue
    }
    if (STATUS_RE.test(trimmed)) {
      i++
      continue
    }
    buf.push(lines[i])
    i++
  }
  // 末尾に残った本文（最後のメッセージは時刻が付かず、ステータス行で終わる）
  if (buf.some((l) => l.trim() !== '')) rawMessages.push({ lines: buf, time: null, date: curDate })

  // 先頭メッセージの日付が不明な場合（最初の日付区切りより前）は、最初に判明した日付で近似する。
  const firstKnownIdx = rawMessages.findIndex((m) => m.date !== null)
  if (firstKnownIdx > 0) {
    for (let k = 0; k < firstKnownIdx; k++) rawMessages[k].date = rawMessages[firstKnownIdx].date
  } else if (firstKnownIdx === -1) {
    for (const m of rawMessages) m.date = today
  }

  const out: ParsedThreadMessage[] = []
  let lastMs: number | null = null
  for (const m of rawMessages) {
    const content = m.lines.join('\n').trim()
    if (!content) continue
    const date = m.date ?? today
    let createdAt: string
    if (m.time) {
      createdAt = jstToSql(date, m.time.h, m.time.m)
    } else if (lastMs != null) {
      // 最終メッセージ等、時刻が復元できない場合は直前メッセージの1分後として順序だけ保つ。
      createdAt = new Date(lastMs + 60_000).toISOString().slice(0, 19).replace('T', ' ')
    } else {
      createdAt = jstToSql(date, now.getUTCHours(), now.getUTCMinutes())
    }
    lastMs = new Date(`${createdAt.replace(' ', 'T')}Z`).getTime()
    out.push({ content, createdAt })
  }
  return out
}
