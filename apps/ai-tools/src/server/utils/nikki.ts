// nikki（日記）のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、記録は user_id でスコープする。
// 本文・トピックは encrypt.ts で暗号化して保存する（読み返す前提の個人の記録なので平文では置かない）。
//
// ★Google カレンダーへのアクセスはこのファイルに置かない（nikki-google.ts にまとめてある）。
// ★トピック抽出の匙加減も置かない（nikki-ai.ts に集約。文言を直すのはあちら）。

import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import {
  isNikkiDate,
  NIKKI_BODY_MAX,
  NIKKI_DETAIL_MAX,
  NIKKI_HEADLINE_MAX,
} from '~/types/nikki'
import type { NikkiDay, NikkiEntry, NikkiTopic } from '~/types/nikki'

export interface NikkiUser {
  id: string
  username: string
}

/**
 * nikki 用テーブルを（無ければ）用意する。マイグレーション未適用の環境向けの保険。
 * D1 の db.exec() は改行を文の区切りとして扱い、複数行の CREATE TABLE が静かに失敗するため、
 * ここでは prepare().run() を使う（整形は src/server/db/067_nikki.sql 側でやる）。
 */
export async function ensureNikkiTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS nikki_entries (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      date TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_nikki_entries_user_date ON nikki_entries (user_id, date)`,
    `CREATE TABLE IF NOT EXISTS nikki_topics (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      entry_id TEXT NOT NULL,
      date TEXT NOT NULL,
      headline TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      impact INTEGER NOT NULL DEFAULT 3,
      sort_order INTEGER NOT NULL DEFAULT 0,
      edited INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_nikki_topics_user_date ON nikki_topics (user_id, date DESC, impact DESC, sort_order ASC)`,
    `CREATE INDEX IF NOT EXISTS idx_nikki_topics_entry ON nikki_topics (entry_id)`,
    `CREATE TABLE IF NOT EXISTS nikki_google_connections (
      user_id TEXT PRIMARY KEY,
      refresh_token TEXT NOT NULL,
      calendar_ids TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER,
      updated_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS nikki_oauth_states (
      state TEXT PRIMARY KEY, user_id TEXT NOT NULL, verifier TEXT NOT NULL, created_at INTEGER
    )`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
}

/** ログイン必須。未ログインなら 401。 */
export async function requireNikkiUser(event: any): Promise<NikkiUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無ければ 503。テーブルの用意もここで済ませる。 */
export async function requireNikkiDb(event: any): Promise<any> {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  await ensureNikkiTables(db)
  return db
}

/** ルートパラメータ等から来た日付を検証する。 */
export function requireDate(value: unknown): string {
  if (!isNikkiDate(value)) throw createError({ statusCode: 400, message: '日付の形式が不正です（YYYY-MM-DD）' })
  return value
}

// ─────────────────────────────── 記録（本文） ───────────────────────────────

interface EntryRow {
  id: string
  date: string
  body: string
  updated_at: string
}

async function findEntryRow(db: any, userId: string, date: string): Promise<EntryRow | null> {
  const row = await db
    .prepare('SELECT id, date, body, updated_at FROM nikki_entries WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first()
  return (row as EntryRow) ?? null
}

/** その日の記録（本文＋トピック）。無ければ空の形で返す（画面側で分岐を増やさないため）。 */
export async function loadEntry(event: any, db: any, userId: string, date: string): Promise<NikkiEntry> {
  const row = await findEntryRow(db, userId, date)
  const topics = await loadTopics(event, db, userId, date)
  if (!row) return { date, body: '', topics, updatedAt: '' }
  return {
    date,
    body: row.body ? await decryptComment(event, row.body) : '',
    topics,
    updatedAt: row.updated_at ?? '',
  }
}

/**
 * 本文を追記する（音声の文字起こし1回・テキスト入力1回ぶん）。
 * 上書きではなく追記なのは、1日のあいだに何度も話しかける使い方を想定しているため。
 * 返り値は「追記した分」と「追記後の全文」と entry_id。
 */
export async function appendEntryBody(
  event: any,
  db: any,
  userId: string,
  date: string,
  addition: string
): Promise<{ entryId: string; added: string; body: string }> {
  const added = addition.trim()
  if (!added) throw createError({ statusCode: 400, message: '入力が空です' })

  const existing = await findEntryRow(db, userId, date)
  const prevBody = existing?.body ? await decryptComment(event, existing.body) : ''
  // 文字数上限を超えたら古い側を削る（長さを理由に保存そのものを失敗させない）。
  const merged = (prevBody ? `${prevBody}\n\n${added}` : added).slice(-NIKKI_BODY_MAX)
  const enc = await encryptComment(event, merged)

  if (existing) {
    await db
      .prepare("UPDATE nikki_entries SET body = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(enc, existing.id)
      .run()
    return { entryId: existing.id, added, body: merged }
  }

  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO nikki_entries (id, user_id, date, body) VALUES (?, ?, ?, ?)')
    .bind(id, userId, date, enc)
    .run()
  return { entryId: id, added, body: merged }
}

// ─────────────────────────────── トピック ───────────────────────────────

interface TopicRow {
  id: string
  date: string
  headline: string
  detail: string
  impact: number
  sort_order: number
  edited: number
  created_at: string
}

async function shapeTopic(event: any, row: TopicRow): Promise<NikkiTopic> {
  return {
    id: row.id,
    date: row.date,
    headline: row.headline ? await decryptComment(event, row.headline) : '',
    detail: row.detail ? await decryptComment(event, row.detail) : '',
    impact: row.impact,
    edited: !!row.edited,
    createdAt: row.created_at ?? '',
  }
}

/** インパクトの大きい順 → 追加順。タイムラインも詳細も同じ並びで見せる。 */
const TOPIC_ORDER = 'impact DESC, sort_order ASC, created_at ASC'

export async function loadTopics(event: any, db: any, userId: string, date: string): Promise<NikkiTopic[]> {
  const res = await db
    .prepare(
      `SELECT id, date, headline, detail, impact, sort_order, edited, created_at
       FROM nikki_topics WHERE user_id = ? AND date = ? ORDER BY ${TOPIC_ORDER}`
    )
    .bind(userId, date)
    .all()
  const rows: TopicRow[] = res?.results ?? []
  return await Promise.all(rows.map((r) => shapeTopic(event, r)))
}

export interface NewTopic {
  headline: string
  detail: string
  impact: number
}

/** 見出し・本文・インパクトを保存できる形に整える。AIの出力もクライアントの手編集も必ずここを通す。 */
export function normalizeTopic(input: Partial<NewTopic>): NewTopic | null {
  const headline = (input.headline ?? '').replace(/\s+/g, ' ').trim().slice(0, NIKKI_HEADLINE_MAX)
  if (!headline) return null
  const detail = (input.detail ?? '').trim().slice(0, NIKKI_DETAIL_MAX)
  const raw = Number(input.impact)
  const impact = Number.isFinite(raw) ? Math.min(5, Math.max(1, Math.round(raw))) : 3
  return { headline, detail, impact }
}

/** 次に使う sort_order（同じ日の末尾）。 */
async function nextTopicSortOrder(db: any, userId: string, date: string): Promise<number> {
  const row = await db
    .prepare('SELECT MAX(sort_order) AS max_order FROM nikki_topics WHERE user_id = ? AND date = ?')
    .bind(userId, date)
    .first()
  return ((row as any)?.max_order ?? 0) + 1
}

/** トピックを追記する（既存は消さない）。 */
export async function addTopics(
  event: any,
  db: any,
  userId: string,
  date: string,
  entryId: string,
  topics: NewTopic[]
): Promise<void> {
  if (!topics.length) return
  let order = await nextTopicSortOrder(db, userId, date)
  for (const t of topics) {
    await db
      .prepare(
        `INSERT INTO nikki_topics (id, user_id, entry_id, date, headline, detail, impact, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        userId,
        entryId,
        date,
        await encryptComment(event, t.headline),
        await encryptComment(event, t.detail),
        t.impact,
        order++
      )
      .run()
  }
}

/** その日のトピックを消す。手で直したものを残したいときは keepEdited を立てる。 */
export async function clearTopics(db: any, userId: string, date: string, keepEdited: boolean): Promise<void> {
  const sql = keepEdited
    ? 'DELETE FROM nikki_topics WHERE user_id = ? AND date = ? AND edited = 0'
    : 'DELETE FROM nikki_topics WHERE user_id = ? AND date = ?'
  await db.prepare(sql).bind(userId, date).run()
}

export async function findOwnedTopic(db: any, userId: string, id: string): Promise<{ id: string; date: string; entryId: string } | null> {
  const row = await db
    .prepare('SELECT id, date, entry_id FROM nikki_topics WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first()
  if (!row) return null
  return { id: (row as any).id, date: (row as any).date, entryId: (row as any).entry_id }
}

/** 手編集。edited を立てて「作り直し」で消えないようにする。 */
export async function updateTopic(event: any, db: any, userId: string, id: string, patch: NewTopic): Promise<void> {
  await db
    .prepare('UPDATE nikki_topics SET headline = ?, detail = ?, impact = ?, edited = 1 WHERE id = ? AND user_id = ?')
    .bind(
      await encryptComment(event, patch.headline),
      await encryptComment(event, patch.detail),
      patch.impact,
      id,
      userId
    )
    .run()
}

export async function deleteTopic(db: any, userId: string, id: string): Promise<void> {
  await db.prepare('DELETE FROM nikki_topics WHERE id = ? AND user_id = ?').bind(id, userId).run()
}

// ─────────────────────────────── タイムライン ───────────────────────────────

/**
 * 画面下部のタイムライン用に「記録のある日」を新しい順に返す。
 * before を渡すとその日より前だけ＝左（過去）へスクロールしたときの追い読みに使う。
 *
 * トピックは日付の範囲でまとめて1クエリ引き、JS 側で日ごとに束ねる
 * （日数ぶん D1 を叩くと Workers の subrequest 上限に当たるため）。
 */
export async function loadTimeline(
  event: any,
  db: any,
  userId: string,
  opts: { before?: string; limit: number }
): Promise<NikkiDay[]> {
  const params: any[] = [userId]
  let where = 'user_id = ?'
  if (opts.before) {
    where += ' AND date < ?'
    params.push(opts.before)
  }

  // 「記録のある日」＝本文がある日。トピック0件の日もタイムラインには出す（書いた事実は残す）。
  const daysRes = await db
    .prepare(`SELECT date FROM nikki_entries WHERE ${where} ORDER BY date DESC LIMIT ?`)
    .bind(...params, opts.limit)
    .all()
  const dates: string[] = (daysRes?.results ?? []).map((r: any) => r.date)
  if (!dates.length) return []

  const placeholders = dates.map(() => '?').join(',')
  const topicsRes = await db
    .prepare(
      `SELECT id, date, headline, detail, impact, sort_order, edited, created_at
       FROM nikki_topics WHERE user_id = ? AND date IN (${placeholders})
       ORDER BY date DESC, ${TOPIC_ORDER}`
    )
    .bind(userId, ...dates)
    .all()
  const topicRows: TopicRow[] = topicsRes?.results ?? []

  const byDate = new Map<string, NikkiTopic[]>()
  for (const row of topicRows) {
    const topic = await shapeTopic(event, row)
    const list = byDate.get(row.date)
    if (list) list.push(topic)
    else byDate.set(row.date, [topic])
  }

  return dates.map((date) => ({ date, topics: byDate.get(date) ?? [], hasBody: true }))
}

/** 月表示で「この日は書いた」の印を付けるための日付一覧（YYYY-MM）。 */
export async function loadMonthMarks(db: any, userId: string, month: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT date FROM nikki_entries WHERE user_id = ? AND date LIKE ? ORDER BY date ASC")
    .bind(userId, `${month}-%`)
    .all()
  return (res?.results ?? []).map((r: any) => r.date)
}
