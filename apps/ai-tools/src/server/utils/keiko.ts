// 剣道 けいこ記録アプリ (keiko) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、記録は user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import type { KeikoItem, KeikoMember, KeikoPointBucket, KeikoRecord } from '~/types/keiko'

export interface KeikoUser {
  id: string
  username: string
}

/**
 * keiko 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱うため、各 CREATE TABLE は1行で書く。
 */
export async function ensureKeikoTables(db: any): Promise<void> {
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS keiko_members (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS keiko_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, member_id TEXT NOT NULL DEFAULT '', name TEXT NOT NULL DEFAULT '', rep_count INTEGER NOT NULL DEFAULT 1, point_per_rep INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS keiko_records (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, member_id TEXT NOT NULL, item_id TEXT NOT NULL, date TEXT NOT NULL, rate INTEGER NOT NULL DEFAULT 100, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  // 既存テーブルへの列追加（適用済みなら duplicate column name で落ちるので握りつぶす）
  await db.exec(`ALTER TABLE keiko_items ADD COLUMN member_id TEXT NOT NULL DEFAULT ''`).catch(() => {})
  await db.exec(`ALTER TABLE keiko_items ADD COLUMN rep_count INTEGER NOT NULL DEFAULT 1`).catch(() => {})
  await db.exec(`ALTER TABLE keiko_items ADD COLUMN point_per_rep INTEGER NOT NULL DEFAULT 1`).catch(() => {})
  await db.exec(`ALTER TABLE keiko_records ADD COLUMN rate INTEGER NOT NULL DEFAULT 100`).catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireKeikoUser(event: any): Promise<KeikoUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireKeikoDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

const DEFAULT_MEMBER_NAMES = ['護', '匡', '真啓']
/** 新しいメンバーに最初から入れておく練習項目（やること・本数・1本あたりのポイント）。 */
const DEFAULT_ITEMS: { name: string; repCount: number; pointPerRep: number }[] = [
  { name: '素振り', repCount: 10, pointPerRep: 1 },
  { name: 'その他の練習', repCount: 1, pointPerRep: 1 },
]

/** メンバーが1人もいなければ、初期メンバーを作成する。 */
export async function seedDefaultMembersIfEmpty(db: any, userId: string): Promise<void> {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM keiko_members WHERE user_id = ?').bind(userId).first<{ n: number }>()
  if ((existing?.n ?? 0) > 0) return
  for (let i = 0; i < DEFAULT_MEMBER_NAMES.length; i++) {
    const memberId = crypto.randomUUID()
    await db
      .prepare('INSERT INTO keiko_members (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(memberId, userId, DEFAULT_MEMBER_NAMES[i], i)
      .run()
    await seedDefaultItemsForMember(db, userId, memberId)
  }
}

/** そのメンバーに練習項目が1件も無ければ、初期項目（素振り等）を作成する。 */
export async function seedDefaultItemsForMember(db: any, userId: string, memberId: string): Promise<void> {
  const existing = await db
    .prepare('SELECT COUNT(*) AS n FROM keiko_items WHERE user_id = ? AND member_id = ?')
    .bind(userId, memberId)
    .first<{ n: number }>()
  if ((existing?.n ?? 0) > 0) return
  for (let i = 0; i < DEFAULT_ITEMS.length; i++) {
    const it = DEFAULT_ITEMS[i]
    await db
      .prepare('INSERT INTO keiko_items (id, user_id, member_id, name, rep_count, point_per_rep, sort_order, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)')
      .bind(crypto.randomUUID(), userId, memberId, it.name, it.repCount, it.pointPerRep, i)
      .run()
  }
}

/**
 * 項目がメンバー共通だった頃（member_id 無し）のデータをメンバーごとの項目へ移し替える。
 * 各メンバーへ同じ内容の項目を複製し、花丸記録の item_id をそのメンバーの複製に付け替えてから旧項目を消す。
 */
export async function migrateSharedItemsToMembers(db: any, userId: string): Promise<void> {
  const legacy = await db
    .prepare("SELECT id, name, sort_order, active FROM keiko_items WHERE user_id = ? AND (member_id IS NULL OR member_id = '') ORDER BY sort_order ASC")
    .bind(userId)
    .all<{ id: string; name: string; sort_order: number; active: number }>()
  const legacyItems = legacy?.results ?? []
  if (legacyItems.length === 0) return

  const members = await loadMembers(db, userId)
  for (const old of legacyItems) {
    for (const member of members) {
      const newId = crypto.randomUUID()
      await db
        .prepare('INSERT INTO keiko_items (id, user_id, member_id, name, rep_count, point_per_rep, sort_order, active) VALUES (?, ?, ?, ?, 1, 1, ?, ?)')
        .bind(newId, userId, member.id, old.name, old.sort_order, old.active)
        .run()
      await db
        .prepare('UPDATE keiko_records SET item_id = ? WHERE user_id = ? AND item_id = ? AND member_id = ?')
        .bind(newId, userId, old.id, member.id)
        .run()
    }
    await db.prepare('DELETE FROM keiko_records WHERE user_id = ? AND item_id = ?').bind(userId, old.id).run()
    await db.prepare('DELETE FROM keiko_items WHERE id = ?').bind(old.id).run()
  }
}

/** メンバーの項目リストでの次の sort_order（末尾に追加）。 */
export async function nextItemSortOrder(db: any, userId: string, memberId: string): Promise<number> {
  const row = await db
    .prepare('SELECT MAX(sort_order) AS m FROM keiko_items WHERE user_id = ? AND member_id = ?')
    .bind(userId, memberId)
    .first<{ m: number | null }>()
  return (row?.m ?? -1) + 1
}

/** メンバー一覧での次の sort_order（末尾に追加）。 */
export async function nextMemberSortOrder(db: any, userId: string): Promise<number> {
  const row = await db.prepare('SELECT MAX(sort_order) AS m FROM keiko_members WHERE user_id = ?').bind(userId).first<{ m: number | null }>()
  return (row?.m ?? -1) + 1
}

interface MemberRow {
  id: string
  name: string
  sort_order: number
}
interface ItemRow {
  id: string
  member_id: string
  name: string
  rep_count: number
  point_per_rep: number
  sort_order: number
  active: number
}
interface RecordRow {
  member_id: string
  item_id: string
  date: string
  rate: number
}

export function shapeKeikoMember(row: MemberRow): KeikoMember {
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

export function shapeKeikoItem(row: ItemRow): KeikoItem {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    repCount: row.rep_count,
    pointPerRep: row.point_per_rep,
    sortOrder: row.sort_order,
    active: !!row.active,
  }
}

export function shapeKeikoRecord(row: RecordRow): KeikoRecord {
  return { memberId: row.member_id, itemId: row.item_id, date: row.date, rate: row.rate ?? 100 }
}

/** 指定ユーザーのメンバー一覧（sort_order 昇順）。 */
export async function loadMembers(db: any, userId: string): Promise<KeikoMember[]> {
  const rows = await db.prepare('SELECT id, name, sort_order FROM keiko_members WHERE user_id = ? ORDER BY sort_order ASC').bind(userId).all<MemberRow>()
  return (rows?.results ?? []).map(shapeKeikoMember)
}

/** 指定ユーザーの練習項目一覧（メンバー別・sort_order 昇順）。非表示分も含む。 */
export async function loadItems(db: any, userId: string): Promise<KeikoItem[]> {
  const rows = await db
    .prepare('SELECT id, member_id, name, rep_count, point_per_rep, sort_order, active FROM keiko_items WHERE user_id = ? ORDER BY sort_order ASC')
    .bind(userId)
    .all<ItemRow>()
  return (rows?.results ?? []).map(shapeKeikoItem)
}

/** 指定ユーザー・指定期間 [from, to] の評価記録。 */
export async function loadRecords(db: any, userId: string, from: string, to: string): Promise<KeikoRecord[]> {
  const rows = await db
    .prepare('SELECT member_id, item_id, date, rate FROM keiko_records WHERE user_id = ? AND date >= ? AND date <= ?')
    .bind(userId, from, to)
    .all<RecordRow>()
  return (rows?.results ?? []).map(shapeKeikoRecord)
}

/**
 * 期間 [from, to] のポイントをメンバー×日（unit='day'）またはメンバー×月（unit='month'）で集計する。
 * ポイントは項目の現在の設定（本数 × 1本あたりのポイント）に、その日の評価（rate％）を掛けて都度計算する。
 * `/ 100.0` と書かないと SQLite の整数除算で rate<100 が全部 0 になるので注意。
 * 1件ずつ ROUND してから SUM する（クライアント側の週集計と丸め方を揃えるため）。
 */
export async function loadPointBuckets(db: any, userId: string, from: string, to: string, unit: 'day' | 'month'): Promise<KeikoPointBucket[]> {
  const keyExpr = unit === 'month' ? 'substr(r.date, 1, 7)' : 'r.date'
  const rows = await db
    .prepare(
      `SELECT r.member_id AS member_id, ${keyExpr} AS key, SUM(ROUND(i.rep_count * i.point_per_rep * r.rate / 100.0)) AS points ` +
        'FROM keiko_records r JOIN keiko_items i ON i.id = r.item_id ' +
        'WHERE r.user_id = ? AND r.date >= ? AND r.date <= ? ' +
        `GROUP BY r.member_id, ${keyExpr}`
    )
    .bind(userId, from, to)
    .all<{ member_id: string; key: string; points: number }>()
  const results: { member_id: string; key: string; points: number }[] = rows?.results ?? []
  return results.map((r) => ({ memberId: r.member_id, key: r.key, points: r.points ?? 0 }))
}

/** YYYY-MM-DD 形式かどうか。 */
export function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

/** 評価％の正規化。0 なら記録を消す意味、それ以外は 10〜100 の10刻みへ丸める。 */
export function normalizeRate(v: unknown): number {
  const n = Math.round(Number(v) / 10) * 10
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.min(n, 100)
}

/** 本数・ポイントの正規化（1以上の整数、上限は事故防止のゆるい値）。 */
export function normalizeCount(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n) || n < 1) return fallback
  return Math.min(n, 9999)
}
