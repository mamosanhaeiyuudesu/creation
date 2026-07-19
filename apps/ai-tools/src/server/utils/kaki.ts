// 柿の木 里親アプリ (kaki) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、users.role で
// admin（農家=阪中さん）と foster（里親）を区別する。
import { getAppDb } from '~/server/utils/auth'

const SESSION_COOKIE = 'app-session'

export type KakiRole = 'admin' | 'foster'

export interface KakiUser {
  id: string
  username: string
  role: KakiRole
}

/** kaki 用テーブルと users.role 列を（無ければ）用意する。dev/未マイグレーション環境向けの保険。 */
export async function ensureKakiTables(db: any): Promise<void> {
  // users への role 列追加。既にある場合は duplicate column で失敗するので握りつぶす。
  await db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'foster'`).catch(() => {})

  await db.exec(`
    CREATE TABLE IF NOT EXISTS kaki_trees (
      id TEXT PRIMARY KEY, number INTEGER NOT NULL DEFAULT 0, nickname TEXT NOT NULL DEFAULT '',
      foster_user_id TEXT, planted_year INTEGER, location_note TEXT NOT NULL DEFAULT '',
      personality TEXT NOT NULL DEFAULT '', strengths TEXT NOT NULL DEFAULT '[]',
      weaknesses TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'healthy',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kaki_observations (
      id TEXT PRIMARY KEY, tree_id TEXT NOT NULL, observed_at TEXT NOT NULL,
      photo_url TEXT, raw_note TEXT NOT NULL DEFAULT '', ai_story TEXT NOT NULL DEFAULT '',
      ai_tree_voice TEXT, fruit_size_mm INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kaki_comments (
      id TEXT PRIMARY KEY, tree_id TEXT NOT NULL, user_id TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS kaki_health_events (
      id TEXT PRIMARY KEY, tree_id TEXT NOT NULL, year INTEGER NOT NULL DEFAULT 0,
      event_type TEXT NOT NULL DEFAULT 'disease', raw_label TEXT NOT NULL DEFAULT '',
      ai_label TEXT NOT NULL DEFAULT '', ai_description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
}

/** セッションからログインユーザーと role を取得。未ログインなら null。 */
export async function getKakiUser(event: any): Promise<KakiUser | null> {
  const db = getAppDb(event)
  if (!db) return null

  const token = getCookie(event, SESSION_COOKIE)
  if (!token) return null

  const row = await db
    .prepare(
      `SELECT u.id, u.username, COALESCE(u.role, 'foster') AS role
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.id = ? AND s.expires_at > datetime('now')`
    )
    .bind(token)
    .first<{ id: string; username: string; role: string }>()

  if (!row) return null
  return { id: row.id, username: row.username, role: (row.role === 'admin' ? 'admin' : 'foster') }
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireKakiUser(event: any): Promise<KakiUser> {
  const user = await getKakiUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** 管理者（農家）必須。里親なら 403 を throw。 */
export async function requireAdmin(event: any): Promise<KakiUser> {
  const user = await requireKakiUser(event)
  if (user.role !== 'admin') throw createError({ statusCode: 403, message: '管理者のみ操作できます' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

// ── 行 → API レスポンス整形 ──────────────────────────────

export interface TreeRow {
  id: string
  number: number
  nickname: string
  foster_user_id: string | null
  planted_year: number | null
  location_note: string
  personality: string
  strengths: string
  weaknesses: string
  status: string
  created_at: string
}

/** kaki_trees の行を JSON 配列展開してクライアント向けに整形する。 */
export function shapeTree(row: TreeRow) {
  return {
    id: row.id,
    number: row.number,
    nickname: row.nickname,
    fosterUserId: row.foster_user_id,
    plantedYear: row.planted_year,
    locationNote: row.location_note,
    personality: row.personality,
    strengths: parseArray(row.strengths),
    weaknesses: parseArray(row.weaknesses),
    status: row.status,
    createdAt: row.created_at,
  }
}

function parseArray(raw: string): string[] {
  try {
    const v = JSON.parse(raw)
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
