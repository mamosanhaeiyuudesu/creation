// ゲストハウス案内アプリ (guesthouse) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、宿は user_id でスコープする。
// 共有リンクは share_token で公開し、ログイン不要でお客様がチャットにアクセスできる。
import { getAppDb } from '~/server/utils/auth'
import type {
  Consult,
  Diary,
  DiaryContent,
  GuestFact,
  House,
  HouseSummary,
  MessageRole,
  SessionDetail,
  SessionSummary,
  ThreadMessage,
} from '~/types/guesthouse'

const SESSION_COOKIE = 'app-session'

export interface GuesthouseUser {
  id: string
  username: string
  role: string
}

/** guesthouse 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。 */
export async function ensureGuesthouseTables(db: any): Promise<void> {
  // 管理者判定は kaki と同じ users.role 列を共用する（admin=ホスト運営者）。
  // 既に列があれば duplicate column で失敗するので握りつぶす。
  await db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'guest'`).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_houses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
      welcome TEXT NOT NULL DEFAULT '', share_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_facts (
      id TEXT PRIMARY KEY, house_id TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `).catch(() => {})
  // 案内項目の種別（info=事務 / tip=おすすめ素材）。既にあれば duplicate column で失敗するので握りつぶす。
  await db.exec(`ALTER TABLE guesthouse_facts ADD COLUMN type TEXT NOT NULL DEFAULT 'info'`).catch(() => {})
  // フェーズ2・3：会話の永続化・相談・日記
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_sessions (
      id TEXT PRIMARY KEY, house_id TEXT NOT NULL, guest_name TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_messages (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'guest',
      content TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_consults (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, house_id TEXT NOT NULL,
      question TEXT NOT NULL DEFAULT '', draft TEXT NOT NULL DEFAULT '',
      answer TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_diaries (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, house_id TEXT NOT NULL,
      guest_name TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '{}',
      summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

/** セッションからログインユーザーと role を取得（未ログインなら null）。 */
async function getGuesthouseSessionUser(event: any): Promise<GuesthouseUser | null> {
  const db = getAppDb(event)
  if (!db) return null
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null
  const row = await db
    .prepare(
      `SELECT u.id, u.username, COALESCE(u.role, 'guest') AS role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ id: string; username: string; role: string }>()
  if (!row) return null
  return { id: row.id, username: row.username, role: row.role }
}

/** ホスト機能はゲストハウス運営者（管理者）専用。未ログインなら 401、管理者以外は 403。 */
export async function requireGuesthouseUser(event: any): Promise<GuesthouseUser> {
  const user = await getGuesthouseSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: '管理者のみ利用できます' })
  return user
}

/** DB が無ければ 503。 */
export function requireGuesthouseDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/** 共有リンク用トークン（推測困難な32文字）。 */
export function makeGuesthouseShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

// ── 整形 ──────────────────────────────

interface HouseRow {
  id: string
  name: string
  welcome: string
  share_token: string
  created_at: string
  updated_at: string
}
interface FactRow {
  id: string
  house_id: string
  category: string
  title: string
  body: string
  sort_order: number
  type: string | null
}

function shapeFact(row: FactRow): GuestFact {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    body: row.body,
    type: row.type === 'tip' ? 'tip' : 'info',
  }
}

function shapeHouse(row: HouseRow, facts: FactRow[]): House {
  return {
    id: row.id,
    name: row.name,
    welcome: row.welcome,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    facts: facts.map(shapeFact),
  }
}

/** 一覧用サマリ（案内本文は含めず件数だけ）。 */
export async function loadHouseSummaries(db: any, userId: string): Promise<HouseSummary[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_houses WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(userId)
    .all<HouseRow>()
  const houses: HouseRow[] = rows?.results ?? []
  if (!houses.length) return []

  const ids = houses.map((h) => h.id)
  const ph = ids.map(() => '?').join(',')
  const factRows = await db
    .prepare(`SELECT house_id FROM guesthouse_facts WHERE house_id IN (${ph})`)
    .bind(...ids)
    .all<{ house_id: string }>()

  const countByHouse = new Map<string, number>()
  for (const f of factRows?.results ?? []) {
    countByHouse.set(f.house_id, (countByHouse.get(f.house_id) ?? 0) + 1)
  }

  return houses.map((h) => ({
    id: h.id,
    name: h.name,
    shareToken: h.share_token,
    factCount: countByHouse.get(h.id) ?? 0,
    updatedAt: h.updated_at,
  }))
}

/** 宿を案内項目込みで取得。owner 指定なら所有者チェック、token 指定なら公開解決。 */
export async function loadHouse(
  db: any,
  by: { userId?: string; houseId?: string; shareToken?: string }
): Promise<House | null> {
  let row: HouseRow | null = null
  if (by.shareToken) {
    row = await db.prepare('SELECT * FROM guesthouse_houses WHERE share_token = ?').bind(by.shareToken).first<HouseRow>()
  } else if (by.houseId && by.userId) {
    row = await db
      .prepare('SELECT * FROM guesthouse_houses WHERE id = ? AND user_id = ?')
      .bind(by.houseId, by.userId)
      .first<HouseRow>()
  }
  if (!row) return null
  const factRows = await db
    .prepare('SELECT * FROM guesthouse_facts WHERE house_id = ? ORDER BY sort_order ASC')
    .bind(row.id)
    .all<FactRow>()
  return shapeHouse(row, factRows?.results ?? [])
}

/** 宿の案内項目を一括置換する（更新は全消し→入れ直しでシンプルに揃える）。 */
export async function replaceFacts(
  db: any,
  houseId: string,
  facts: { category: string; title: string; body: string; type?: string }[]
): Promise<void> {
  await db.prepare('DELETE FROM guesthouse_facts WHERE house_id = ?').bind(houseId).run()
  let order = 0
  for (const f of facts) {
    const category = (f?.category ?? '').trim()
    const title = (f?.title ?? '').trim()
    const body = (f?.body ?? '').trim()
    const type = f?.type === 'tip' ? 'tip' : 'info'
    if (!title && !body) continue // 空行はスキップ
    await db
      .prepare('INSERT INTO guesthouse_facts (id, house_id, category, title, body, sort_order, type) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), houseId, category, title, body, order++, type)
      .run()
  }
}

/** お客様に見せる「案内できる話題」の見出し（事務案内=info のカテゴリのみ・重複除去）。 */
export function factCategories(facts: GuestFact[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const f of facts) {
    if (f.type !== 'info') continue
    const c = f.category.trim()
    if (c && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  return out
}

/** 自動応答（お客様チャット）用の知識ベース。事務案内=info だけを根拠にする。 */
export function buildKnowledgeBase(house: House): string {
  const infos = house.facts.filter((f) => f.type === 'info')
  const lines: string[] = []
  lines.push(`【宿名】${house.name || '（未設定）'}`)
  if (house.welcome.trim()) lines.push(`【宿のコンセプト・ウェルカム】\n${house.welcome.trim()}`)
  lines.push('')
  lines.push('【事務案内（この情報だけを根拠に答える）】')
  if (!infos.length) {
    lines.push('（登録された案内情報はまだありません）')
  } else {
    for (const f of infos) {
      const head = [f.category, f.title].filter((x) => x.trim()).join(' / ')
      lines.push(`■ ${head || '案内'}\n${f.body}`)
    }
  }
  return lines.join('\n')
}

/** 相談の下書き（提案）用の素材。おすすめ=tip をまとめる。無ければ空文字。 */
export function buildTipsBase(house: House): string {
  const tips = house.facts.filter((f) => f.type === 'tip')
  if (!tips.length) return ''
  return tips
    .map((f) => {
      const head = [f.category, f.title].filter((x) => x.trim()).join(' / ')
      return `■ ${head || 'おすすめ'}\n${f.body}`
    })
    .join('\n')
}

// ── フェーズ2・3：滞在セッション / メッセージ ──────────────────

export function makeSessionToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

interface SessionRow {
  id: string
  house_id: string
  guest_name: string
  status: string
  created_at: string
  updated_at: string
}
interface MessageRow {
  id: string
  session_id: string
  role: string
  content: string
  kind: string
  created_at: string
}

function shapeMessage(row: MessageRow): ThreadMessage {
  const role: MessageRole = row.role === 'auto' ? 'auto' : row.role === 'host' ? 'host' : 'guest'
  return { id: row.id, role, content: row.content, kind: row.kind, createdAt: row.created_at }
}

/** 宿(share_token)に紐づくセッションを取得または新規作成。所属チェック込み。 */
export async function resolveSession(
  db: any,
  houseId: string,
  sessionId?: string,
  guestName?: string
): Promise<SessionRow> {
  if (sessionId && /^[0-9a-f]{32}$/.test(sessionId)) {
    const row = await db
      .prepare('SELECT * FROM guesthouse_sessions WHERE id = ? AND house_id = ?')
      .bind(sessionId, houseId)
      .first<SessionRow>()
    if (row) {
      if (guestName && guestName.trim() && guestName.trim() !== row.guest_name) {
        await db.prepare('UPDATE guesthouse_sessions SET guest_name = ? WHERE id = ?').bind(guestName.trim(), sessionId).run()
        row.guest_name = guestName.trim()
      }
      return row
    }
  }
  const id = makeSessionToken()
  await db
    .prepare('INSERT INTO guesthouse_sessions (id, house_id, guest_name) VALUES (?, ?, ?)')
    .bind(id, houseId, (guestName ?? '').trim())
    .run()
  return { id, house_id: houseId, guest_name: (guestName ?? '').trim(), status: 'active', created_at: '', updated_at: '' }
}

export async function touchSession(db: any, sessionId: string): Promise<void> {
  await db.prepare("UPDATE guesthouse_sessions SET updated_at = datetime('now') WHERE id = ?").bind(sessionId).run()
}

export async function addMessage(
  db: any,
  sessionId: string,
  role: MessageRole,
  content: string,
  kind = ''
): Promise<void> {
  await db
    .prepare('INSERT INTO guesthouse_messages (id, session_id, role, content, kind) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), sessionId, role, content, kind)
    .run()
  await touchSession(db, sessionId)
}

export async function loadMessages(db: any, sessionId: string): Promise<ThreadMessage[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC')
    .bind(sessionId)
    .all<MessageRow>()
  return (rows?.results ?? []).map(shapeMessage)
}

// ── ホスト向け：会話一覧 / 詳細 ───────────────────────────

/** 指定ユーザーが宿を所有しているか確認し、宿の行を返す（無ければ null）。 */
export async function getOwnedHouse(db: any, userId: string, houseId: string): Promise<{ id: string; name: string } | null> {
  return await db
    .prepare('SELECT id, name FROM guesthouse_houses WHERE id = ? AND user_id = ?')
    .bind(houseId, userId)
    .first<{ id: string; name: string }>()
}

export async function loadSessionSummaries(db: any, houseId: string): Promise<SessionSummary[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_sessions WHERE house_id = ? ORDER BY updated_at DESC')
    .bind(houseId)
    .all<SessionRow>()
  const sessions: SessionRow[] = rows?.results ?? []
  if (!sessions.length) return []
  const ids = sessions.map((s) => s.id)
  const ph = ids.map(() => '?').join(',')
  const msgCounts = await db
    .prepare(`SELECT session_id, COUNT(*) AS c FROM guesthouse_messages WHERE session_id IN (${ph}) GROUP BY session_id`)
    .bind(...ids)
    .all<{ session_id: string; c: number }>()
  const diaryRows = await db
    .prepare(`SELECT DISTINCT session_id FROM guesthouse_diaries WHERE session_id IN (${ph})`)
    .bind(...ids)
    .all<{ session_id: string }>()
  const consultRows = await db
    .prepare(`SELECT session_id, COUNT(*) AS c FROM guesthouse_consults WHERE session_id IN (${ph}) AND status = 'pending' GROUP BY session_id`)
    .bind(...ids)
    .all<{ session_id: string; c: number }>()

  const countBy = new Map<string, number>()
  for (const r of msgCounts?.results ?? []) countBy.set(r.session_id, r.c)
  const hasDiary = new Set<string>((diaryRows?.results ?? []).map((r: any) => r.session_id))
  const pendingBy = new Map<string, number>()
  for (const r of consultRows?.results ?? []) pendingBy.set(r.session_id, r.c)

  return sessions.map((s) => ({
    id: s.id,
    guestName: s.guest_name,
    messageCount: countBy.get(s.id) ?? 0,
    hasDiary: hasDiary.has(s.id),
    pendingConsults: pendingBy.get(s.id) ?? 0,
    updatedAt: s.updated_at,
  }))
}

/** 会話詳細（所有者チェック込み）。宿を所有していなければ null。 */
export async function loadSessionDetail(db: any, userId: string, sessionId: string): Promise<SessionDetail | null> {
  const row = await db
    .prepare(
      `SELECT s.*, h.name AS house_name, h.user_id AS owner_id
       FROM guesthouse_sessions s JOIN guesthouse_houses h ON h.id = s.house_id
       WHERE s.id = ?`
    )
    .bind(sessionId)
    .first<SessionRow & { house_name: string; owner_id: string }>()
  if (!row || row.owner_id !== userId) return null
  const messages = await loadMessages(db, sessionId)
  const diary = await getDiaryBySession(db, sessionId)
  return {
    id: row.id,
    houseId: row.house_id,
    houseName: row.house_name,
    guestName: row.guest_name,
    status: row.status,
    messages,
    diary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── 相談（handoff）───────────────────────────────────────

interface ConsultRow {
  id: string
  session_id: string
  house_id: string
  question: string
  draft: string
  answer: string
  status: string
  created_at: string
}

export async function createConsult(
  db: any,
  sessionId: string,
  houseId: string,
  question: string,
  draft: string
): Promise<void> {
  await db
    .prepare('INSERT INTO guesthouse_consults (id, session_id, house_id, question, draft) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), sessionId, houseId, question, draft)
    .run()
}

/** 未対応の相談を、宿名・お客様名込みでユーザー所有分だけ取得。 */
export async function loadPendingConsults(db: any, userId: string): Promise<Consult[]> {
  const rows = await db
    .prepare(
      `SELECT c.*, h.name AS house_name, s.guest_name AS guest_name
       FROM guesthouse_consults c
       JOIN guesthouse_houses h ON h.id = c.house_id
       LEFT JOIN guesthouse_sessions s ON s.id = c.session_id
       WHERE h.user_id = ? AND c.status = 'pending'
       ORDER BY c.created_at ASC`
    )
    .bind(userId)
    .all<ConsultRow & { house_name: string; guest_name: string }>()
  return (rows?.results ?? []).map((r: any) => ({
    id: r.id,
    houseId: r.house_id,
    houseName: r.house_name,
    sessionId: r.session_id,
    guestName: r.guest_name ?? '',
    question: r.question,
    draft: r.draft,
    answer: r.answer,
    status: (r.status as Consult['status']) ?? 'pending',
    createdAt: r.created_at,
  }))
}

/** 相談を取得（所有者チェック込み）。 */
export async function getOwnedConsult(db: any, userId: string, consultId: string): Promise<ConsultRow | null> {
  const row = await db
    .prepare(
      `SELECT c.* FROM guesthouse_consults c JOIN guesthouse_houses h ON h.id = c.house_id
       WHERE c.id = ? AND h.user_id = ?`
    )
    .bind(consultId, userId)
    .first<ConsultRow>()
  return row ?? null
}

/** 相談に回答（承認）。会話スレッドに阪中さんメッセージとして投稿し、相談を answered に。 */
export async function answerConsult(db: any, consult: ConsultRow, answer: string): Promise<void> {
  await addMessage(db, consult.session_id, 'host', answer, 'reply')
  await db
    .prepare("UPDATE guesthouse_consults SET answer = ?, status = 'answered', updated_at = datetime('now') WHERE id = ?")
    .bind(answer, consult.id)
    .run()
}

export async function dismissConsult(db: any, consultId: string): Promise<void> {
  await db
    .prepare("UPDATE guesthouse_consults SET status = 'dismissed', updated_at = datetime('now') WHERE id = ?")
    .bind(consultId)
    .run()
}

// ── お客さん日記 ─────────────────────────────────────────

interface DiaryRow {
  id: string
  session_id: string
  house_id: string
  guest_name: string
  content: string
  summary: string
  created_at: string
}

function shapeDiary(row: DiaryRow): Diary {
  let content: DiaryContent
  try {
    const p = JSON.parse(row.content)
    content = {
      nationality: String(p?.nationality ?? ''),
      itinerary: String(p?.itinerary ?? ''),
      highlights: String(p?.highlights ?? ''),
      notes: String(p?.notes ?? ''),
    }
  } catch {
    content = { nationality: '', itinerary: '', highlights: '', notes: '' }
  }
  return {
    id: row.id,
    houseId: row.house_id,
    sessionId: row.session_id,
    guestName: row.guest_name,
    content,
    summary: row.summary,
    createdAt: row.created_at,
  }
}

/** 日記を保存（1セッション1件・既存があれば置換）。 */
export async function saveDiary(
  db: any,
  sessionId: string,
  houseId: string,
  guestName: string,
  content: DiaryContent,
  summary: string
): Promise<Diary> {
  await db.prepare('DELETE FROM guesthouse_diaries WHERE session_id = ?').bind(sessionId).run()
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO guesthouse_diaries (id, session_id, house_id, guest_name, content, summary) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, sessionId, houseId, guestName, JSON.stringify(content), summary)
    .run()
  const row = await db.prepare('SELECT * FROM guesthouse_diaries WHERE id = ?').bind(id).first<DiaryRow>()
  return shapeDiary(row)
}

export async function getDiaryBySession(db: any, sessionId: string): Promise<Diary | null> {
  const row = await db
    .prepare('SELECT * FROM guesthouse_diaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(sessionId)
    .first<DiaryRow>()
  return row ? shapeDiary(row) : null
}

export async function loadDiaries(db: any, houseId: string): Promise<Diary[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_diaries WHERE house_id = ? ORDER BY created_at DESC')
    .bind(houseId)
    .all<DiaryRow>()
  return (rows?.results ?? []).map(shapeDiary)
}
