// 議事録の正規化とD1の読み書き。
// apps/ai-tools/src/server/utils/kikigaki.ts が土台。大きな違いは2つ:
//   ① **必ず user_id で絞る**（ai-tools 版は身内で共有する前提で絞っていない。本番では他人の会議が
//      見えてしまうので、一覧・取得・更新・削除のすべてで所有者を確認する）
//   ② 承認送信フロー時代の列（status / doc_url / sent_tasks / approved_at …）を持たない

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { encryptText, decryptText } from '~/server/utils/encrypt'
import { emptyMinutes, normalizeLayout, normalizeMode } from '~/types/minutes'
import { normalizeTags } from '~/utils/tags'
import type {
  EventItem,
  Minutes,
  MinutesPoint,
  MinutesRecord,
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

/**
 * YYYY-MM-DDTHH:mm か、時刻のない YYYY-MM-DD に揃える。それ以外は空にする。
 * 予定は日付だけ分かって時刻が決まっていないことも多いので、日付だけでも残す
 * （時刻を 00:00 などで埋めると、PDFに無かった時刻が載ってしまう）。
 */
function normalizeDateTime(v: unknown): string {
  const s = str(v).replace(' ', 'T')
  const m = s.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/)
  if (m) return `${m[1]}T${m[2]}`
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
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

/**
 * 参加者は1人1要素の配列で持つ。AIが「田中さん、佐藤さん」と1行で返してきても区切って受け取る。
 * 空欄は落とす（画面の末尾の入力欄が空のまま保存されても、空の参加者が増えないように）。
 * 参加者を足す前に作った議事録は undefined なので空配列になる。
 */
function normalizeParticipants(v: unknown): string[] {
  const list = Array.isArray(v) ? v.map(str) : str(v).split(/[、,，\n]/)
  return list.map((p) => p.trim()).filter(Boolean)
}

/** 構造化JSONを画面・DBで扱う形に揃える。欠けたキーは空で埋める（落とさない） */
export function normalizeMinutes(raw: any): Minutes {
  if (!raw || typeof raw !== 'object') return emptyMinutes()
  return {
    mode: normalizeMode(raw.mode),
    layout: normalizeLayout(raw.layout),
    title: str(raw.title),
    date: normalizeDate(raw.date),
    participants: normalizeParticipants(raw.participants),
    summary: str(raw.summary),
    decisions: normalizePoints(raw.decisions),
    discussions: normalizePoints(raw.discussions),
    keyMessages: normalizePoints(raw.keyMessages ?? raw.key_messages),
    topics: normalizePoints(raw.topics),
    quotes: normalizePoints(raw.quotes),
    taskCandidates: normalizeTasks(raw.taskCandidates ?? raw.task_candidates),
    eventCandidates: normalizeEvents(raw.eventCandidates ?? raw.event_candidates),
    unclearPoints: arr(raw.unclearPoints ?? raw.unclear_points).map(str).filter(Boolean),
    tags: normalizeTags(raw.tags),
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
  mode: string
  created_at: string
  updated_at: string
}

/** record_tags の暗号文 → タグの並び。空・壊れていれば空 */
export async function decryptTags(event: H3Event, enc: string): Promise<string[]> {
  if (!enc) return []
  try {
    return normalizeTags(JSON.parse(await decryptText(event, enc)))
  } catch {
    return []
  }
}

/** 一覧用のタグの行を書く文（batch に入れて使う）。タグが空なら行ごと消す */
export async function tagsStatement(db: any, event: H3Event, userId: string, recordId: string, tags: string[]) {
  if (!tags.length) return db.prepare('DELETE FROM record_tags WHERE record_id = ? AND user_id = ?').bind(recordId, userId)
  return db
    .prepare(
      `INSERT INTO record_tags (record_id, user_id, tags) VALUES (?, ?, ?)
       ON CONFLICT (record_id) DO UPDATE SET tags = excluded.tags`
    )
    .bind(recordId, userId, await encryptText(event, JSON.stringify(tags)))
}

/** 一覧に出す行だけ（文字起こし・議事録本文は読まない＝復号の手間を省く） */
const LIST_COLS = 'id, title, meeting_date, audio_name, created_at'
const FULL_COLS = `${LIST_COLS}, user_id, transcript, minutes, updated_at`

/** 新しい議事録を1件作る。戻り値はID */
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
      `INSERT INTO records (id, user_id, title, meeting_date, audio_name, transcript, minutes, mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      await encryptText(event, minutes.title),
      minutes.date,
      // ファイル名にも会議の中身が出うる（「◯◯さん面談.txt」など）ので暗号化する（2026-10-17〜。
      // それより前の行は平文のまま残っているが、decryptText は平文をそのまま返すので読める）
      await encryptText(event, audioName),
      await encryptText(event, transcript),
      await encryptText(event, JSON.stringify(minutes)),
      minutes.mode
    )
    .run()
  return id
}

/** 本人の議事録を新しい順に返す */
export async function listRecords(event: H3Event, userId: string): Promise<RecordSummary[]> {
  const db = requireDb(event)
  await ensureTables(db)
  // タグは一覧のために別の表（record_tags）に持っている。議事録本体（minutes）を復号しなくて済むように
  const res = await db
    .prepare(
      `SELECT r.id, r.title, r.meeting_date, r.audio_name, r.mode, r.created_at, COALESCE(t.tags, '') AS tags
       FROM records r LEFT JOIN record_tags t ON t.record_id = r.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 200`
    )
    .bind(userId)
    .all()
  const rows: (RecordRow & { tags: string })[] = res?.results ?? []
  return await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      title: await decryptText(event, row.title ?? ''),
      date: row.meeting_date ?? '',
      audioName: await decryptText(event, row.audio_name ?? ''),
      createdAt: row.created_at ?? '',
      mode: normalizeMode(row.mode),
      tags: await decryptTags(event, row.tags),
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

  const minutes = normalizeMinutes(parsed)
  return {
    id: row.id,
    title: await decryptText(event, row.title ?? ''),
    date: row.meeting_date ?? '',
    audioName: await decryptText(event, row.audio_name ?? ''),
    createdAt: row.created_at ?? '',
    updatedAt: row.updated_at ?? '',
    // 種類は議事録本体（minutes）のほうを正とする（列は一覧を軽く読むための写し）
    mode: minutes.mode,
    tags: minutes.tags,
    transcript: await decryptText(event, row.transcript ?? ''),
    minutes,
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
  await ensureTables(db)
  const res = await db
    .prepare(
      `UPDATE records
       SET title = ?, meeting_date = ?, minutes = ?, mode = ?, updated_at = datetime('now')
       WHERE id = ? AND user_id = ?`
    )
    .bind(
      await encryptText(event, minutes.title),
      minutes.date,
      await encryptText(event, JSON.stringify(minutes)),
      minutes.mode,
      id,
      userId
    )
    .run()
  const saved = (res?.meta?.changes ?? 0) > 0
  // 本人の議事録が書き換えられたときだけ、一覧用のタグも揃える（他人のIDでタグの行を作らない）
  if (saved) await (await tagsStatement(db, event, userId, id, minutes.tags)).run()
  return saved
}

/** 会議の名前の上限（一覧から変えるとき。長すぎる名前で表示が崩れないように） */
export const MAX_TITLE_LENGTH = 100

/**
 * 会議の名前だけを変える（一覧から）。議事録本体（minutes）の title と、一覧用の title 列の両方を書き換える。
 * 議事録全体を画面から送り直す方式にしないのは、確認画面を別のタブで開いていたときに、
 * 古い中身で上書きしてしまわないため。戻り値は保存した名前（本人の行が無ければ null）。
 */
export async function updateRecordTitle(
  event: H3Event,
  userId: string,
  id: string,
  rawTitle: string
): Promise<string | null> {
  const title = rawTitle.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT minutes FROM records WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first()) as { minutes: string } | null
  if (!row) return null

  let parsed: any = null
  try {
    parsed = JSON.parse(await decryptText(event, row.minutes ?? ''))
  } catch {
    parsed = null
  }
  // 議事録本体が読めないものは触らない（壊れた中身を空の議事録で上書きしないため）
  if (!parsed) throw createError({ statusCode: 500, message: 'この議事録は読み込めなかったため、名前を変えられませんでした。' })
  const minutes = normalizeMinutes(parsed)
  minutes.title = title

  await db
    .prepare(
      `UPDATE records SET title = ?, minutes = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?`
    )
    .bind(await encryptText(event, title), await encryptText(event, JSON.stringify(minutes)), id, userId)
    .run()
  return title
}

/** 削除。本人の行だけ */
export async function deleteRecord(event: H3Event, userId: string, id: string): Promise<boolean> {
  const db = requireDb(event)
  await ensureTables(db)
  const [res] = await db.batch([
    db.prepare('DELETE FROM records WHERE id = ? AND user_id = ?').bind(id, userId),
    db.prepare('DELETE FROM record_tags WHERE record_id = ? AND user_id = ?').bind(id, userId),
  ])
  return (res?.meta?.changes ?? 0) > 0
}
