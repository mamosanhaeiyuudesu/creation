// 議事録の正規化とD1の読み書き。
// apps/ai-tools/src/server/utils/kikigaki.ts が土台。大きな違いは2つ:
//   ① **必ず user_id で絞る**（ai-tools 版は身内で共有する前提で絞っていない。本番では他人の会議が
//      見えてしまうので、一覧・取得・更新・削除のすべてで所有者を確認する）
//   ② 承認送信フロー時代の列（status / doc_url / sent_tasks / approved_at …）を持たない

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { encryptText, decryptText } from '~/server/utils/encrypt'
import {
  emptyMinutes,
  DEFAULT_SUMMARY_MAX_CHARS,
  DEFAULT_RIGHT_MAX_CHARS,
  PRINT_MAX_CHARS_MIN,
  PRINT_MAX_CHARS_MAX,
} from '~/types/minutes'
import type {
  EventItem,
  Minutes,
  MinutesPoint,
  MinutesRecord,
  PrintSettings,
  RecordSummary,
  TaskItem,
} from '~/types/minutes'

// ── 正規化 ────────────────────────────────────────────────
// AIの出力もクライアントからの編集も、そのまま信じずここを通してから保存する。

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : []
}

/** YYYY-MM-DD 以外は空にする（変な値が日付欄に残らないように） */
function normalizeDate(v: unknown): string {
  const s = str(v)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

/** YYYY-MM-DDTHH:mm 以外は空にする（datetime-local と同じ形） */
function normalizeDateTime(v: unknown): string {
  const s = str(v).replace(' ', 'T')
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  return m ? `${m[1]}T${m[2]}` : ''
}

function normalizePoints(v: unknown): MinutesPoint[] {
  return arr(v)
    .map((p) => ({ content: str(p?.content), note: str(p?.note) }))
    .filter((p) => p.content)
}

function normalizeTasks(v: unknown): TaskItem[] {
  return arr(v)
    .map((t) => ({
      assignee: str(t?.assignee),
      task: str(t?.task),
      due: str(t?.due),
      dueDate: normalizeDate(t?.dueDate ?? t?.due_date),
    }))
    .filter((t) => t.task)
}

function normalizeEvents(v: unknown): EventItem[] {
  return arr(v)
    .map((e) => ({
      datetime: str(e?.datetime),
      title: str(e?.title),
      location: str(e?.location),
      start: normalizeDateTime(e?.start),
      end: normalizeDateTime(e?.end),
    }))
    .filter((e) => e.title || e.datetime)
}

/** 100〜3000の整数に丸める。数値でなければ既定値（PDFの要約が延々と走らないための保険） */
function clampMaxChars(v: unknown, fallback: number): number {
  const n = Number(v)
  if (!Number.isFinite(n)) return fallback
  return Math.min(PRINT_MAX_CHARS_MAX, Math.max(PRINT_MAX_CHARS_MIN, Math.round(n)))
}

function normalizePrintSettings(v: unknown): PrintSettings {
  const src = v && typeof v === 'object' ? (v as any) : {}
  return {
    summaryMaxChars: clampMaxChars(src.summaryMaxChars, DEFAULT_SUMMARY_MAX_CHARS),
    rightMaxChars: clampMaxChars(src.rightMaxChars, DEFAULT_RIGHT_MAX_CHARS),
  }
}

/** 構造化JSONを画面・DBで扱う形に揃える。欠けたキーは空で埋める（落とさない） */
export function normalizeMinutes(raw: any): Minutes {
  if (!raw || typeof raw !== 'object') return emptyMinutes()
  return {
    title: str(raw.title),
    date: normalizeDate(raw.date),
    summary: str(raw.summary),
    decisions: normalizePoints(raw.decisions),
    discussions: normalizePoints(raw.discussions),
    taskCandidates: normalizeTasks(raw.taskCandidates ?? raw.task_candidates),
    eventCandidates: normalizeEvents(raw.eventCandidates ?? raw.event_candidates),
    unclearPoints: arr(raw.unclearPoints ?? raw.unclear_points).map(str).filter(Boolean),
    printSettings: normalizePrintSettings(raw.printSettings ?? raw.print_settings),
  }
}

// ── D1 の読み書き ─────────────────────────────────────────

interface RecordRow {
  id: string
  user_id: string
  title: string
  meeting_date: string
  audio_name: string
  transcript: string
  minutes: string
  created_at: string
  updated_at: string
}

/** 一覧に出す行だけ（文字起こし・議事録本文は読まない＝復号の手間を省く） */
const LIST_COLS = 'id, title, meeting_date, audio_name, created_at'
const FULL_COLS = `${LIST_COLS}, user_id, transcript, minutes, updated_at`

/** 新しい議事録を1件つくる。戻り値はID */
export async function createRecord(
  event: H3Event,
  userId: string,
  audioName: string,
  transcript: string,
  minutes: Minutes
): Promise<string> {
  const db = requireDb(event)
  await ensureTables(db)
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO records (id, user_id, title, meeting_date, audio_name, transcript, minutes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      await encryptText(event, minutes.title),
      minutes.date,
      audioName,
      await encryptText(event, transcript),
      await encryptText(event, JSON.stringify(minutes))
    )
    .run()
  return id
}

/** 本人の議事録を新しい順に返す */
export async function listRecords(event: H3Event, userId: string): Promise<RecordSummary[]> {
  const db = requireDb(event)
  await ensureTables(db)
  const res = await db
    .prepare(`SELECT ${LIST_COLS} FROM records WHERE user_id = ? ORDER BY created_at DESC LIMIT 200`)
    .bind(userId)
    .all()
  const rows: RecordRow[] = res?.results ?? []
  return await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: await decryptText(event, row.title ?? ''),
      date: row.meeting_date ?? '',
      audioName: row.audio_name ?? '',
      createdAt: row.created_at ?? '',
    }))
  )
}

/** 本人の議事録を1件返す。他人のものや存在しないIDは null（404にして区別を見せない） */
export async function getRecord(event: H3Event, userId: string, id: string): Promise<MinutesRecord | null> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare(`SELECT ${FULL_COLS} FROM records WHERE id = ? AND user_id = ?`)
    .bind(id, userId)
    .first()) as RecordRow | null
  if (!row) return null

  const minutesJson = await decryptText(event, row.minutes ?? '')
  let parsed: any = null
  try {
    parsed = JSON.parse(minutesJson)
  } catch {
    parsed = null
  }

  return {
    id: row.id,
    title: await decryptText(event, row.title ?? ''),
    date: row.meeting_date ?? '',
    audioName: row.audio_name ?? '',
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
    transcript: await decryptText(event, row.transcript ?? ''),
    minutes: normalizeMinutes(parsed),
  }
}

/** 確認画面での編集を保存する。書き換えられるのは本人の行だけ */
export async function updateRecordMinutes(
  event: H3Event,
  userId: string,
  id: string,
  minutes: Minutes
): Promise<boolean> {
  const db = requireDb(event)
  const res = await db
    .prepare(
      `UPDATE records
       SET title = ?, meeting_date = ?, minutes = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      await encryptText(event, minutes.title),
      minutes.date,
      await encryptText(event, JSON.stringify(minutes)),
      id,
      userId
    )
    .run()
  return (res?.meta?.changes ?? 0) > 0
}

/** 削除。本人の行だけ */
export async function deleteRecord(event: H3Event, userId: string, id: string): Promise<boolean> {
  const db = requireDb(event)
  const res = await db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return (res?.meta?.changes ?? 0) > 0
}
