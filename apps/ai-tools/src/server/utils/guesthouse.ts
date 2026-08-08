// ゲストハウス案内アプリ (guesthouse) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、宿は user_id でスコープする。
// 共有リンクは share_token で公開し、ログイン不要でお客様がチャットにアクセスできる。
import type { H3Event } from 'h3'
import { getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import type {
  Consult,
  Diary,
  GuestFact,
  HearingNote,
  House,
  HouseSummary,
  MessageRole,
  Review,
  SessionDetail,
  SessionListItem,
  SessionSummary,
  ThreadMessage,
  Tip,
  TrendItem,
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
      guest_name TEXT NOT NULL DEFAULT '', content TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  // フェーズ3：旅の情報（おすすめ素材）はホスト共通で持つ。
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_tips (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0
    )
  `).catch(() => {})
  // 傾向のキャッシュ（学習ループ）。管理トップの全宿横断傾向を、ユーザー単位で
  // 前回結果＋日記/レビューの指紋とともに1組だけ保持する（「更新」時に指紋一致なら再計算をスキップ）。
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_trends (
      user_id TEXT PRIMARY KEY, items TEXT NOT NULL DEFAULT '[]',
      fingerprint TEXT NOT NULL DEFAULT '', based_on INTEGER NOT NULL DEFAULT 0,
      computed_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  // 傾向の材料件数（レビュー・意見の件数）。既にあれば duplicate column で失敗するので握りつぶす。
  await db.exec(`ALTER TABLE guesthouse_trends ADD COLUMN reviews_based_on INTEGER NOT NULL DEFAULT 0`).catch(() => {})
  // レビュー・意見（顧客の声）。傾向分析の第2の入力源。ホスト共通・user_id スコープ。body は暗号化保存。
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_reviews (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  // 聞き取りメモ（阪中さんが対面などで直接聞いた内容）。自由記述・1セッションに複数件。content は暗号化保存。
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_hearing_notes (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, house_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
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

// ── 旅の情報（おすすめ素材・ホスト共通）──────────────────

interface TipRow {
  id: string
  category: string
  title: string
  body: string
  sort_order: number
}

/** ホストの旅の情報を取得。 */
export async function loadTips(db: any, userId: string): Promise<Tip[]> {
  const rows = await db
    .prepare('SELECT id, category, title, body, sort_order FROM guesthouse_tips WHERE user_id = ? ORDER BY sort_order ASC')
    .bind(userId)
    .all<TipRow>()
  return (rows?.results ?? []).map((r: TipRow) => ({ id: r.id, category: r.category, title: r.title, body: r.body }))
}

/** ホストの旅の情報を一括置換。 */
export async function replaceTips(
  db: any,
  userId: string,
  tips: { category: string; title: string; body: string }[]
): Promise<void> {
  await db.prepare('DELETE FROM guesthouse_tips WHERE user_id = ?').bind(userId).run()
  let order = 0
  for (const t of tips) {
    const category = (t?.category ?? '').trim()
    const title = (t?.title ?? '').trim()
    const body = (t?.body ?? '').trim()
    if (!title && !body) continue
    await db
      .prepare('INSERT INTO guesthouse_tips (id, user_id, category, title, body, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, category, title, body, order++)
      .run()
  }
}

// ── レビュー・意見（顧客の声・傾向分析の第2入力源）──────────
// body は暗号化保存。source は出典ラベル（平文）。編集時は updated_at を更新し、指紋で変更検知する。

interface ReviewRow {
  id: string
  source: string
  body: string
  created_at: string
  updated_at: string
}

/** ホストのレビュー・意見を取得（body は復号）。新しい順。 */
export async function loadReviews(event: H3Event, db: any, userId: string): Promise<Review[]> {
  const rows = await db
    .prepare('SELECT id, source, body, created_at FROM guesthouse_reviews WHERE user_id = ? ORDER BY created_at DESC')
    .bind(userId)
    .all<ReviewRow>()
  return Promise.all(
    (rows?.results ?? []).map(async (r: ReviewRow) => ({
      id: r.id,
      source: r.source,
      body: await decryptComment(event, r.body),
      createdAt: r.created_at,
    }))
  )
}

/** レビュー・意見を1件追加。作成した行のIDを返す。 */
export async function createReview(event: H3Event, db: any, userId: string, source: string, body: string): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO guesthouse_reviews (id, user_id, source, body) VALUES (?, ?, ?, ?)')
    .bind(id, userId, (source ?? '').trim(), await encryptComment(event, (body ?? '').trim()))
    .run()
  return id
}

/** レビュー・意見を更新（所有者チェック込み）。updated_at も更新（指紋の変更検知用）。変更できたら true。 */
export async function updateReview(
  event: H3Event,
  db: any,
  userId: string,
  id: string,
  source: string,
  body: string
): Promise<boolean> {
  const res = await db
    .prepare("UPDATE guesthouse_reviews SET source = ?, body = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?")
    .bind((source ?? '').trim(), await encryptComment(event, (body ?? '').trim()), id, userId)
    .run()
  return (res?.meta?.changes ?? 0) > 0
}

/** レビュー・意見を削除（所有者チェック込み）。削除できたら true。 */
export async function deleteReview(db: any, userId: string, id: string): Promise<boolean> {
  const res = await db.prepare('DELETE FROM guesthouse_reviews WHERE id = ? AND user_id = ?').bind(id, userId).run()
  return (res?.meta?.changes ?? 0) > 0
}

/** 指定した宿のオーナーの旅の情報を、相談下書き用のテキストにまとめる。無ければ空文字。 */
export async function loadHouseOwnerTipsText(db: any, houseId: string): Promise<string> {
  const owner = await db.prepare('SELECT user_id FROM guesthouse_houses WHERE id = ?').bind(houseId).first<{ user_id: string }>()
  if (!owner) return ''
  const tips = await loadTips(db, owner.user_id)
  return buildTipsText(tips)
}

/** 旅の情報リストを相談下書き用のテキストに整形。 */
export function buildTipsText(tips: Tip[]): string {
  if (!tips.length) return ''
  return tips
    .map((t) => {
      const head = [t.category, t.title].filter((x) => x.trim()).join(' / ')
      return `■ ${head || 'おすすめ'}\n${t.body}`
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

function shapeMessage(row: MessageRow, content: string): ThreadMessage {
  const role: MessageRole = row.role === 'auto' ? 'auto' : row.role === 'host' ? 'host' : 'guest'
  return { id: row.id, role, content, kind: row.kind, createdAt: row.created_at }
}

// ── 会話・相談・日記の本文はお客様の個人情報を含みうるため、保存時に暗号化（AES-GCM）する。
// 読み出し時にサーバー側で復号してからUI/AIに渡すので、見え方は変わらない（DB直読みだけが暗号文になる）。
// 平文の既存データは decryptComment のフォールバックでそのまま読める。

/** ホストがお客様1人ぶんの会話（滞在）を新規発行する。返す id がお客様URLのトークンになる。 */
export async function createSession(event: H3Event, db: any, houseId: string, guestName?: string): Promise<string> {
  const id = makeSessionToken()
  await db
    .prepare('INSERT INTO guesthouse_sessions (id, house_id, guest_name) VALUES (?, ?, ?)')
    .bind(id, houseId, await encryptComment(event, (guestName ?? '').trim()))
    .run()
  return id
}

/**
 * お客様URL（= セッショントークン）から、セッションとその宿を解決する。公開（ログイン不要）用。
 * トークンを知っていること自体がアクセス権（推測困難な32桁UUID）。無効なら null。
 */
export async function loadStaySession(
  db: any,
  token: string
): Promise<{ session: SessionRow; house: House } | null> {
  if (!/^[0-9a-f]{32}$/.test(token)) return null
  const session = await db
    .prepare('SELECT * FROM guesthouse_sessions WHERE id = ?')
    .bind(token)
    .first<SessionRow>()
  if (!session) return null
  const houseRow = await db
    .prepare('SELECT * FROM guesthouse_houses WHERE id = ?')
    .bind(session.house_id)
    .first<HouseRow>()
  if (!houseRow) return null
  const factRows = await db
    .prepare('SELECT * FROM guesthouse_facts WHERE house_id = ? ORDER BY sort_order ASC')
    .bind(houseRow.id)
    .all<FactRow>()
  return { session, house: shapeHouse(houseRow, factRows?.results ?? []) }
}

/** セッションのお客様名を必要なら更新する（お客様が名前を入力・変更したとき）。 */
export async function updateGuestNameIfChanged(event: H3Event, db: any, session: SessionRow, name?: string): Promise<void> {
  const clean = (name ?? '').trim()
  if (!clean) return
  const current = await decryptComment(event, session.guest_name ?? '')
  if (clean === current) return
  await db
    .prepare('UPDATE guesthouse_sessions SET guest_name = ? WHERE id = ?')
    .bind(await encryptComment(event, clean), session.id)
    .run()
}

export async function touchSession(db: any, sessionId: string): Promise<void> {
  await db.prepare("UPDATE guesthouse_sessions SET updated_at = datetime('now') WHERE id = ?").bind(sessionId).run()
}

/** セッションをクローズ/再開する（所有者チェック込み）。実際に変更できたら true。 */
export async function setSessionStatus(db: any, userId: string, sessionId: string, status: SessionStatus): Promise<boolean> {
  const res = await db
    .prepare(
      `UPDATE guesthouse_sessions SET status = ?, updated_at = datetime('now')
       WHERE id = ? AND house_id IN (SELECT id FROM guesthouse_houses WHERE user_id = ?)`
    )
    .bind(status, sessionId, userId)
    .run()
  return (res?.meta?.changes ?? 0) > 0
}

/** クローズ済みのセッションに新しい発言が来たら active に戻す（お客様チャット用・所有者チェック不要）。 */
export async function reopenSession(db: any, sessionId: string): Promise<void> {
  await db.prepare("UPDATE guesthouse_sessions SET status = 'active' WHERE id = ?").bind(sessionId).run()
}

/** 会話（滞在セッション）を関連データごと削除する（所有者チェック込み）。削除できたら true。 */
export async function deleteSession(db: any, userId: string, sessionId: string): Promise<boolean> {
  // この会話が自分の宿のものか確認してから消す。
  const owned = await db
    .prepare(
      `SELECT s.id FROM guesthouse_sessions s JOIN guesthouse_houses h ON h.id = s.house_id
       WHERE s.id = ? AND h.user_id = ?`
    )
    .bind(sessionId, userId)
    .first<{ id: string }>()
  if (!owned) return false
  await db.prepare('DELETE FROM guesthouse_messages WHERE session_id = ?').bind(sessionId).run()
  await db.prepare('DELETE FROM guesthouse_consults WHERE session_id = ?').bind(sessionId).run()
  await db.prepare('DELETE FROM guesthouse_diaries WHERE session_id = ?').bind(sessionId).run()
  await db.prepare('DELETE FROM guesthouse_hearing_notes WHERE session_id = ?').bind(sessionId).run()
  await db.prepare('DELETE FROM guesthouse_sessions WHERE id = ?').bind(sessionId).run()
  return true
}

/**
 * 全宿横断のセッション一覧（管理トップの進行中パネル／チャット一覧ページ共通）。ユーザー所有分のみ・宿名付き。
 * opts.status: 'active' | 'closed' | 'all'（既定 all）。opts.houseId で宿で絞り込み。
 * opts.onlyStarted=true でメッセージ0件（未開封）を除外。opts.limit で件数制限。
 */
export async function loadSessions(
  event: H3Event,
  db: any,
  userId: string,
  opts: { status?: 'active' | 'closed' | 'all'; houseId?: string; onlyStarted?: boolean; limit?: number } = {}
): Promise<SessionListItem[]> {
  const where: string[] = ['h.user_id = ?']
  const binds: any[] = [userId]
  if (opts.houseId) {
    where.push('s.house_id = ?')
    binds.push(opts.houseId)
  }
  if (opts.status && opts.status !== 'all') {
    where.push('s.status = ?')
    binds.push(opts.status)
  }
  if (opts.onlyStarted) where.push('EXISTS (SELECT 1 FROM guesthouse_messages m WHERE m.session_id = s.id)')
  let sql = `SELECT s.*, h.name AS house_name FROM guesthouse_sessions s
     JOIN guesthouse_houses h ON h.id = s.house_id
     WHERE ${where.join(' AND ')}
     ORDER BY s.updated_at DESC`
  if (opts.limit) {
    sql += ' LIMIT ?'
    binds.push(opts.limit)
  }
  const rows = await db.prepare(sql).bind(...binds).all<SessionRow & { house_name: string }>()
  const sessions: (SessionRow & { house_name: string })[] = rows?.results ?? []
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

  return Promise.all(
    sessions.map(async (s) => ({
      id: s.id,
      houseId: s.house_id,
      houseName: s.house_name,
      guestName: await decryptName(event, s.guest_name),
      messageCount: countBy.get(s.id) ?? 0,
      hasDiary: hasDiary.has(s.id),
      pendingConsults: pendingBy.get(s.id) ?? 0,
      status: s.status === 'closed' ? 'closed' : 'active',
      updatedAt: s.updated_at,
    }))
  )
}

export async function addMessage(
  event: H3Event,
  db: any,
  sessionId: string,
  role: MessageRole,
  content: string,
  kind = ''
): Promise<void> {
  await db
    .prepare('INSERT INTO guesthouse_messages (id, session_id, role, content, kind) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), sessionId, role, await encryptComment(event, content), kind)
    .run()
  await touchSession(db, sessionId)
}

export async function loadMessages(event: H3Event, db: any, sessionId: string): Promise<ThreadMessage[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_messages WHERE session_id = ? ORDER BY created_at ASC, rowid ASC')
    .bind(sessionId)
    .all<MessageRow>()
  return Promise.all(
    (rows?.results ?? []).map(async (r: MessageRow) => shapeMessage(r, await decryptComment(event, r.content)))
  )
}

/** 暗号化された guest_name を復号する小ヘルパー。 */
async function decryptName(event: H3Event, name: string): Promise<string> {
  return decryptComment(event, name ?? '')
}

// ── ホスト向け：会話一覧 / 詳細 ───────────────────────────

/** 指定ユーザーが宿を所有しているか確認し、宿の行を返す（無ければ null）。 */
export async function getOwnedHouse(db: any, userId: string, houseId: string): Promise<{ id: string; name: string } | null> {
  return await db
    .prepare('SELECT id, name FROM guesthouse_houses WHERE id = ? AND user_id = ?')
    .bind(houseId, userId)
    .first<{ id: string; name: string }>()
}

export async function loadSessionSummaries(event: H3Event, db: any, houseId: string): Promise<SessionSummary[]> {
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

  return Promise.all(
    sessions.map(async (s) => ({
      id: s.id,
      guestName: await decryptName(event, s.guest_name),
      messageCount: countBy.get(s.id) ?? 0,
      hasDiary: hasDiary.has(s.id),
      pendingConsults: pendingBy.get(s.id) ?? 0,
      updatedAt: s.updated_at,
    }))
  )
}

/** 会話詳細（所有者チェック込み）。宿を所有していなければ null。 */
export async function loadSessionDetail(event: H3Event, db: any, userId: string, sessionId: string): Promise<SessionDetail | null> {
  const row = await db
    .prepare(
      `SELECT s.*, h.name AS house_name, h.user_id AS owner_id
       FROM guesthouse_sessions s JOIN guesthouse_houses h ON h.id = s.house_id
       WHERE s.id = ?`
    )
    .bind(sessionId)
    .first<SessionRow & { house_name: string; owner_id: string }>()
  if (!row || row.owner_id !== userId) return null
  const messages = await loadMessages(event, db, sessionId)
  const diary = await getDiaryBySession(event, db, sessionId)
  const hearingNotes = await loadHearingNotes(event, db, sessionId)
  return {
    id: row.id,
    houseId: row.house_id,
    houseName: row.house_name,
    guestName: await decryptName(event, row.guest_name),
    status: row.status,
    messages,
    diary,
    hearingNotes,
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
  event: H3Event,
  db: any,
  sessionId: string,
  houseId: string,
  question: string,
  draft: string
): Promise<void> {
  await db
    .prepare('INSERT INTO guesthouse_consults (id, session_id, house_id, question, draft) VALUES (?, ?, ?, ?, ?)')
    .bind(crypto.randomUUID(), sessionId, houseId, await encryptComment(event, question), await encryptComment(event, draft))
    .run()
}

/** 未対応の相談を、宿名・お客様名込みでユーザー所有分だけ取得（本文・お客様名は復号）。 */
export async function loadPendingConsults(event: H3Event, db: any, userId: string): Promise<Consult[]> {
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
  return Promise.all(
    (rows?.results ?? []).map(async (r: any) => ({
      id: r.id,
      houseId: r.house_id,
      houseName: r.house_name,
      sessionId: r.session_id,
      guestName: await decryptName(event, r.guest_name ?? ''),
      question: await decryptComment(event, r.question ?? ''),
      draft: await decryptComment(event, r.draft ?? ''),
      answer: await decryptComment(event, r.answer ?? ''),
      status: (r.status as Consult['status']) ?? 'pending',
      createdAt: r.created_at,
    }))
  )
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

/** 相談に回答（承認）。会話スレッドに阪中さんメッセージとして投稿し、相談を answered に。回答本文は暗号化保存。 */
export async function answerConsult(event: H3Event, db: any, consult: ConsultRow, answer: string): Promise<void> {
  await addMessage(event, db, consult.session_id, 'host', answer, 'reply')
  await db
    .prepare("UPDATE guesthouse_consults SET answer = ?, status = 'answered', updated_at = datetime('now') WHERE id = ?")
    .bind(await encryptComment(event, answer), consult.id)
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

/** DiaryRow を復号して Diary に整形する（content/guest_name は暗号化保存されている）。summary 列は未使用。 */
async function shapeDiaryDecrypted(event: H3Event, row: DiaryRow): Promise<Diary> {
  const content = await decryptComment(event, row.content)
  const guestName = await decryptName(event, row.guest_name)
  return {
    id: row.id,
    houseId: row.house_id,
    sessionId: row.session_id,
    guestName,
    content,
    createdAt: row.created_at,
  }
}

/** 日記を保存（1セッション1件・既存があれば置換、自由記述の本文）。content/guest_name は暗号化保存。 */
export async function saveDiary(event: H3Event, db: any, sessionId: string, houseId: string, guestName: string, content: string): Promise<Diary> {
  await db.prepare('DELETE FROM guesthouse_diaries WHERE session_id = ?').bind(sessionId).run()
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO guesthouse_diaries (id, session_id, house_id, guest_name, content) VALUES (?, ?, ?, ?, ?)')
    .bind(id, sessionId, houseId, await encryptComment(event, guestName), await encryptComment(event, content))
    .run()
  // 保存した平文の値からそのまま返す（再取得・復号は不要）。
  return { id, houseId, sessionId, guestName, content, createdAt: '' }
}

export async function getDiaryBySession(event: H3Event, db: any, sessionId: string): Promise<Diary | null> {
  const row = await db
    .prepare('SELECT * FROM guesthouse_diaries WHERE session_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(sessionId)
    .first<DiaryRow>()
  return row ? await shapeDiaryDecrypted(event, row) : null
}

export async function loadDiaries(event: H3Event, db: any, houseId: string): Promise<Diary[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_diaries WHERE house_id = ? ORDER BY created_at DESC')
    .bind(houseId)
    .all<DiaryRow>()
  return Promise.all((rows?.results ?? []).map((r: DiaryRow) => shapeDiaryDecrypted(event, r)))
}

/** 指定ユーザーの全宿の日記（管理トップの傾向用）。復号済み・新しい順。 */
export async function loadAllDiaries(event: H3Event, db: any, userId: string): Promise<Diary[]> {
  const rows = await db
    .prepare(
      `SELECT d.* FROM guesthouse_diaries d
       JOIN guesthouse_houses h ON h.id = d.house_id
       WHERE h.user_id = ? ORDER BY d.created_at DESC`
    )
    .bind(userId)
    .all<DiaryRow>()
  return Promise.all((rows?.results ?? []).map((r: DiaryRow) => shapeDiaryDecrypted(event, r)))
}

// ── 聞き取りメモ（阪中さんが対面などで直接聞いた内容・自由記述・1セッションに複数可）──

interface HearingNoteRow {
  id: string
  session_id: string
  content: string
  created_at: string
}

/** セッションの聞き取りメモを取得（content は復号）。新しい順。 */
export async function loadHearingNotes(event: H3Event, db: any, sessionId: string): Promise<HearingNote[]> {
  const rows = await db
    .prepare('SELECT id, session_id, content, created_at FROM guesthouse_hearing_notes WHERE session_id = ? ORDER BY created_at DESC')
    .bind(sessionId)
    .all<HearingNoteRow>()
  return Promise.all(
    (rows?.results ?? []).map(async (r: HearingNoteRow) => ({
      id: r.id,
      sessionId: r.session_id,
      content: await decryptComment(event, r.content),
      createdAt: r.created_at,
    }))
  )
}

/** 聞き取りメモを1件追加。作成した行のIDを返す。 */
export async function createHearingNote(event: H3Event, db: any, sessionId: string, houseId: string, content: string): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO guesthouse_hearing_notes (id, session_id, house_id, content) VALUES (?, ?, ?, ?)')
    .bind(id, sessionId, houseId, await encryptComment(event, content))
    .run()
  return id
}

/** 聞き取りメモを削除（宿の所有者チェック込み）。削除できたら true。 */
export async function deleteHearingNote(db: any, userId: string, id: string): Promise<boolean> {
  const res = await db
    .prepare(
      `DELETE FROM guesthouse_hearing_notes WHERE id = ? AND session_id IN (
         SELECT s.id FROM guesthouse_sessions s JOIN guesthouse_houses h ON h.id = s.house_id WHERE h.user_id = ?
       )`
    )
    .bind(id, userId)
    .run()
  return (res?.meta?.changes ?? 0) > 0
}

// ── 傾向のキャッシュ（学習ループ）───────────────────────────
// 傾向の材料＝日記＋レビュー・意見。両方の指紋を合成して変更検知する。
// 日記は編集のたび「DELETE→新UUIDでINSERT」される（id 集合が指紋になる）。
// レビューは in-place 更新なので id＋updated_at を指紋に含める。復号せず済むので軽い。
export async function loadTrendsMeta(
  db: any,
  userId: string
): Promise<{ fingerprint: string; diaryCount: number; reviewCount: number }> {
  const dRows = await db
    .prepare(
      `SELECT d.id FROM guesthouse_diaries d
       JOIN guesthouse_houses h ON h.id = d.house_id
       WHERE h.user_id = ? ORDER BY d.id`
    )
    .bind(userId)
    .all<{ id: string }>()
  const rRows = await db
    .prepare('SELECT id, updated_at FROM guesthouse_reviews WHERE user_id = ? ORDER BY id')
    .bind(userId)
    .all<{ id: string; updated_at: string }>()
  const diaryIds = (dRows?.results ?? []).map((r: { id: string }) => r.id)
  const reviewParts = (rRows?.results ?? []).map((r: { id: string; updated_at: string }) => `${r.id}@${r.updated_at}`)
  const fingerprint = `d:${diaryIds.length}:${diaryIds.join('.')}|r:${reviewParts.length}:${reviewParts.join('.')}`
  return { fingerprint, diaryCount: diaryIds.length, reviewCount: reviewParts.length }
}

export interface StoredTrends {
  items: TrendItem[]
  basedOn: number
  reviewsBasedOn: number
  computedAt: string
  fingerprint: string
}

/** 保存済みの傾向（前回計算結果）を読む。未計算なら null。 */
export async function loadStoredTrends(db: any, userId: string): Promise<StoredTrends | null> {
  const row = await db
    .prepare('SELECT items, fingerprint, based_on, reviews_based_on, computed_at FROM guesthouse_trends WHERE user_id = ?')
    .bind(userId)
    .first<{ items: string; fingerprint: string; based_on: number; reviews_based_on: number; computed_at: string }>()
  if (!row) return null
  let items: TrendItem[] = []
  try {
    const p = JSON.parse(row.items)
    if (Array.isArray(p)) items = p
  } catch {
    /* noop */
  }
  return {
    items,
    basedOn: row.based_on ?? 0,
    reviewsBasedOn: row.reviews_based_on ?? 0,
    computedAt: row.computed_at,
    fingerprint: row.fingerprint ?? '',
  }
}

/** 傾向を保存（ユーザー単位で1組・upsert）。指紋と件数（日記・レビュー）も一緒に更新する。 */
export async function saveTrendsCache(
  db: any,
  userId: string,
  items: TrendItem[],
  fingerprint: string,
  basedOn: number,
  reviewsBasedOn: number
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO guesthouse_trends (user_id, items, fingerprint, based_on, reviews_based_on, computed_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         items = excluded.items, fingerprint = excluded.fingerprint,
         based_on = excluded.based_on, reviews_based_on = excluded.reviews_based_on, computed_at = excluded.computed_at`
    )
    .bind(userId, JSON.stringify(items), fingerprint, basedOn, reviewsBasedOn)
    .run()
}
