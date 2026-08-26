// キキガキ（会議・地域活動の録音 → 文字起こし → AI構造化 → 人間のレビュー → Google書き込み）の
// サーバー共通処理。認証は既存の WHISPER_DB / users / sessions に相乗りし、記録は user_id でスコープする。
//
// ★このファイルには Google への書き込みを一切置かない。
//   書き込みは kikigaki-google.ts にまとめてあり、それを呼ぶのは
//   「承認」エンドポイント（api/kikigaki/records/[id]/approve.post.ts）ただ1か所だけ。
//   人間が承認ボタンを押す以外の経路で Google に何かが書かれることは無い、という保証をこの分離で作る。

import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import { emptyMinutes } from '~/types/kikigaki'
import type {
  KikigakiEventCandidate,
  KikigakiMinutes,
  KikigakiPoint,
  KikigakiRecord,
  KikigakiRecordSummary,
  KikigakiStatus,
  KikigakiTaskCandidate,
} from '~/types/kikigaki'

export interface KikigakiUser {
  id: string
  username: string
}

/**
 * kikigaki 用テーブルを（無ければ）用意する。マイグレーション未適用の環境向けの保険。
 * D1 の db.exec() は改行を文の区切りとして扱い複数行のCREATE TABLEが静かに失敗するため、
 * ここでは prepare().run() を使う（整形は src/server/db/050_kikigaki.sql 側でやる）。
 */
export async function ensureKikigakiTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS kikigaki_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      title TEXT NOT NULL DEFAULT '',
      meeting_date TEXT NOT NULL DEFAULT '',
      audio_name TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      minutes TEXT NOT NULL DEFAULT '',
      doc_url TEXT NOT NULL DEFAULT '',
      sent_tasks INTEGER NOT NULL DEFAULT 0,
      sent_events INTEGER NOT NULL DEFAULT 0,
      sheet_appended INTEGER NOT NULL DEFAULT 0,
      warnings TEXT NOT NULL DEFAULT '',
      approved_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_kikigaki_records_user ON kikigaki_records (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS kikigaki_oauth_states (
      state TEXT PRIMARY KEY, user_id TEXT NOT NULL, verifier TEXT NOT NULL, created_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS kikigaki_google_connections (
      user_id TEXT PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      spreadsheet_id TEXT NOT NULL DEFAULT '',
      spreadsheet_url TEXT NOT NULL DEFAULT '',
      created_at INTEGER,
      updated_at INTEGER
    )`,
  ]
  for (const sql of statements) await db.prepare(sql).run().catch(() => {})

  // 既存テーブルへの列追加。CREATE TABLE IF NOT EXISTS では足りないので個別に流す
  // （すでにある場合は失敗するが、それは握りつぶしてよい）。
  const columns = [
    `ALTER TABLE kikigaki_records ADD COLUMN sheet_appended INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE kikigaki_records ADD COLUMN warnings TEXT NOT NULL DEFAULT ''`,
  ]
  for (const sql of columns) await db.prepare(sql).run().catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireKikigakiUser(event: any): Promise<KikigakiUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** D1 が無い（ローカルdev等）場合は 503 を throw。 */
export function requireKikigakiDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません（ローカルdevではD1が使えません）' })
  return db
}

// ── 正規化 ────────────────────────────────────────────────
// AIの出力もクライアントからの編集も、そのまま信じずここを通してから保存する。

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function arr(v: unknown): any[] {
  return Array.isArray(v) ? v : []
}

/** YYYY-MM-DD 以外は空にする（カレンダー/シートへ変な値が流れないように） */
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

function normalizePoints(v: unknown): KikigakiPoint[] {
  return arr(v)
    .map((p) => ({ content: str(p?.content), note: str(p?.note) }))
    .filter((p) => p.content)
}

function normalizeTasks(v: unknown): KikigakiTaskCandidate[] {
  return arr(v)
    .map((t) => ({
      assignee: str(t?.assignee),
      task: str(t?.task),
      due: str(t?.due),
      dueDate: normalizeDate(t?.dueDate ?? t?.due_date),
    }))
    .filter((t) => t.task)
}

function normalizeEvents(v: unknown): KikigakiEventCandidate[] {
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

/** 構造化JSONを画面・DBで扱う形に揃える。欠けたキーは空で埋める（落とさない） */
export function normalizeMinutes(raw: any): KikigakiMinutes {
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
  }
}

// ── D1 の読み書き ─────────────────────────────────────────
// 会議の中身（タイトル・文字起こし・議事録JSON）は encrypt.ts で暗号化して保存する。
// 地域の会議には個人名や未確定の話が普通に含まれるため、DBを直接覗いても読めない状態にしておく。

interface RecordRow {
  id: string
  user_id: string
  owner: string | null
  status: string
  title: string
  meeting_date: string
  audio_name: string
  transcript: string
  minutes: string
  doc_url: string
  sent_tasks: number
  sent_events: number
  sheet_appended: number
  warnings: string
  approved_at: string
  created_at: string
  updated_at: string
}

// 記録は「その会議に出ていた全員で読むもの」なので、user_id で絞り込まず全員に見せる。
// user_id は所有者（アップロードした人）の記録として残し、表示と削除の可否にだけ使う。
const SUMMARY_COLS =
  'r.id, r.user_id, u.username AS owner, r.status, r.title, r.meeting_date, r.audio_name, r.doc_url, r.created_at'
const FULL_COLS = `${SUMMARY_COLS}, r.transcript, r.minutes, r.sent_tasks, r.sent_events, r.sheet_appended, r.warnings, r.approved_at, r.updated_at`
const FROM_RECORDS = 'FROM kikigaki_records r LEFT JOIN users u ON u.id = r.user_id'

async function toSummary(event: any, row: RecordRow, viewerId: string): Promise<KikigakiRecordSummary> {
  return {
    id: row.id,
    status: (row.status === 'approved' ? 'approved' : 'draft') as KikigakiStatus,
    title: await decryptComment(event, row.title ?? ''),
    date: row.meeting_date ?? '',
    audioName: row.audio_name ?? '',
    docUrl: row.doc_url ?? '',
    createdAt: row.created_at ?? '',
    owner: row.owner ?? '',
    isOwner: row.user_id === viewerId,
  }
}

/** 新しい下書きを1件つくる（この時点では Google には何も送らない）。 */
export async function createRecord(
  event: any,
  userId: string,
  audioName: string,
  transcript: string,
  minutes: KikigakiMinutes
): Promise<string> {
  const db = requireKikigakiDb(event)
  await ensureKikigakiTables(db)
  const id = crypto.randomUUID()
  await db
    .prepare(
      `INSERT INTO kikigaki_records (id, user_id, status, title, meeting_date, audio_name, transcript, minutes)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      userId,
      await encryptComment(event, minutes.title),
      minutes.date,
      audioName,
      await encryptComment(event, transcript),
      await encryptComment(event, JSON.stringify(minutes))
    )
    .run()
  return id
}

/** 全員ぶんの記録を新しい順に返す（共有）。viewerId は「自分のものか」の判定にだけ使う。 */
export async function listRecords(event: any, viewerId: string): Promise<KikigakiRecordSummary[]> {
  const db = requireKikigakiDb(event)
  await ensureKikigakiTables(db)
  const res = await db
    .prepare(`SELECT ${SUMMARY_COLS} ${FROM_RECORDS} ORDER BY r.created_at DESC LIMIT 200`)
    .all()
  const rows: RecordRow[] = res?.results ?? []
  return Promise.all(rows.map((r) => toSummary(event, r, viewerId)))
}

/** 1件を返す（共有なので所有者でなくても読める）。 */
export async function getRecord(event: any, viewerId: string, id: string): Promise<KikigakiRecord | null> {
  const db = requireKikigakiDb(event)
  await ensureKikigakiTables(db)
  const row = (await db
    .prepare(`SELECT ${FULL_COLS} ${FROM_RECORDS} WHERE r.id = ?`)
    .bind(id)
    .first()) as RecordRow | null
  if (!row) return null

  const minutesJson = await decryptComment(event, row.minutes ?? '')
  let parsed: any = null
  try {
    parsed = JSON.parse(minutesJson)
  } catch {
    parsed = null
  }

  return {
    ...(await toSummary(event, row, viewerId)),
    transcript: await decryptComment(event, row.transcript ?? ''),
    minutes: normalizeMinutes(parsed),
    sentTasks: row.sent_tasks ?? 0,
    sentEvents: row.sent_events ?? 0,
    sheetAppended: !!row.sheet_appended,
    warnings: parseWarnings(row.warnings),
    approvedAt: row.approved_at ?? '',
    updatedAt: row.updated_at ?? '',
  }
}

/**
 * レビュー画面での編集を保存する。記録は共有なので、所有者でなくても直せる
 * （会議に出ていた誰かが気づいた間違いを直せるほうが実態に合う）。
 * 承認済みの記録は編集させない（Googleへ送った内容とズレるため）。
 */
export async function updateRecordMinutes(event: any, id: string, minutes: KikigakiMinutes): Promise<void> {
  const db = requireKikigakiDb(event)
  await db
    .prepare(
      `UPDATE kikigaki_records
       SET title = ?, meeting_date = ?, minutes = ?, updated_at = datetime('now')
       WHERE id = ? AND status = 'draft'`
    )
    .bind(
      await encryptComment(event, minutes.title),
      minutes.date,
      await encryptComment(event, JSON.stringify(minutes)),
      id
    )
    .run()
}

function parseWarnings(raw: string | null | undefined): string[] {
  if (!raw) return []
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

/**
 * 承認してGoogleへ送り終えた記録に印をつける。以後この記録は再送も編集もできない。
 * 書き込めなかったぶん（warnings）も保存する＝画面を開き直しても消えないようにするため。
 * 一時的な失敗で一覧の行が欠けたことに、あとから気づけなくなるのを防ぐ。
 */
export async function markApproved(
  event: any,
  id: string,
  result: { docUrl: string; sentTasks: number; sentEvents: number; warnings: string[]; sheetAppended: boolean }
): Promise<void> {
  const db = requireKikigakiDb(event)
  await db
    .prepare(
      `UPDATE kikigaki_records
       SET status = 'approved', doc_url = ?, sent_tasks = ?, sent_events = ?,
           sheet_appended = ?, warnings = ?,
           approved_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    )
    .bind(
      result.docUrl,
      result.sentTasks,
      result.sentEvents,
      result.sheetAppended ? 1 : 0,
      JSON.stringify(result.warnings),
      id
    )
    .run()
}

/** 議事録一覧への追記だけを後からやり直せたときに印をつける（警告も消す）。 */
export async function markSheetAppended(event: any, id: string): Promise<void> {
  const db = requireKikigakiDb(event)
  await db
    .prepare(
      `UPDATE kikigaki_records SET sheet_appended = 1, warnings = '', updated_at = datetime('now') WHERE id = ?`
    )
    .bind(id)
    .run()
}

/**
 * 削除だけは所有者（アップロードした人）に限る。
 * 読み書きは共有でよいが、他人の記録を消せてしまうのは取り返しがつかないため。
 */
export async function deleteRecord(event: any, userId: string, id: string): Promise<boolean> {
  const db = requireKikigakiDb(event)
  const res = await db.prepare('DELETE FROM kikigaki_records WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return (res?.meta?.changes ?? 0) > 0
}
