// 剣道 けいこ記録アプリ (keiko) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、記録は user_id でスコープする。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import type { KeikoItem, KeikoMember, KeikoRecord } from '~/types/keiko'

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
      `CREATE TABLE IF NOT EXISTS keiko_items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS keiko_records (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, member_id TEXT NOT NULL, item_id TEXT NOT NULL, date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
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
const DEFAULT_ITEM_NAMES = ['素振り', 'その他の練習']

/** メンバーが1人もいなければ、初期メンバーを作成する。 */
export async function seedDefaultMembersIfEmpty(db: any, userId: string): Promise<void> {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM keiko_members WHERE user_id = ?').bind(userId).first<{ n: number }>()
  if ((existing?.n ?? 0) > 0) return
  for (let i = 0; i < DEFAULT_MEMBER_NAMES.length; i++) {
    await db
      .prepare('INSERT INTO keiko_members (id, user_id, name, sort_order) VALUES (?, ?, ?, ?)')
      .bind(crypto.randomUUID(), userId, DEFAULT_MEMBER_NAMES[i], i)
      .run()
  }
}

/** 練習項目が1件もなければ、初期項目（素振り等）を作成する。 */
export async function seedDefaultItemsIfEmpty(db: any, userId: string): Promise<void> {
  const existing = await db.prepare('SELECT COUNT(*) AS n FROM keiko_items WHERE user_id = ?').bind(userId).first<{ n: number }>()
  if ((existing?.n ?? 0) > 0) return
  for (let i = 0; i < DEFAULT_ITEM_NAMES.length; i++) {
    await db
      .prepare('INSERT INTO keiko_items (id, user_id, name, sort_order, active) VALUES (?, ?, ?, ?, 1)')
      .bind(crypto.randomUUID(), userId, DEFAULT_ITEM_NAMES[i], i)
      .run()
  }
}

/** 指定テーブルでの次の sort_order（末尾に追加）。 */
export async function nextSortOrder(db: any, table: 'keiko_members' | 'keiko_items', userId: string): Promise<number> {
  const row = await db.prepare(`SELECT MAX(sort_order) AS m FROM ${table} WHERE user_id = ?`).bind(userId).first<{ m: number | null }>()
  return (row?.m ?? -1) + 1
}

interface MemberRow {
  id: string
  name: string
  sort_order: number
}
interface ItemRow {
  id: string
  name: string
  sort_order: number
  active: number
}
interface RecordRow {
  member_id: string
  item_id: string
  date: string
}

export function shapeKeikoMember(row: MemberRow): KeikoMember {
  return { id: row.id, name: row.name, sortOrder: row.sort_order }
}

export function shapeKeikoItem(row: ItemRow): KeikoItem {
  return { id: row.id, name: row.name, sortOrder: row.sort_order, active: !!row.active }
}

export function shapeKeikoRecord(row: RecordRow): KeikoRecord {
  return { memberId: row.member_id, itemId: row.item_id, date: row.date }
}

/** 指定ユーザーのメンバー一覧（sort_order 昇順）。 */
export async function loadMembers(db: any, userId: string): Promise<KeikoMember[]> {
  const rows = await db.prepare('SELECT id, name, sort_order FROM keiko_members WHERE user_id = ? ORDER BY sort_order ASC').bind(userId).all<MemberRow>()
  return (rows?.results ?? []).map(shapeKeikoMember)
}

/** 指定ユーザーの練習項目一覧（sort_order 昇順）。非表示分も含む。 */
export async function loadItems(db: any, userId: string): Promise<KeikoItem[]> {
  const rows = await db.prepare('SELECT id, name, sort_order, active FROM keiko_items WHERE user_id = ? ORDER BY sort_order ASC').bind(userId).all<ItemRow>()
  return (rows?.results ?? []).map(shapeKeikoItem)
}

/** 指定ユーザー・指定期間 [from, to] の花丸記録。 */
export async function loadRecords(db: any, userId: string, from: string, to: string): Promise<KeikoRecord[]> {
  const rows = await db
    .prepare('SELECT member_id, item_id, date FROM keiko_records WHERE user_id = ? AND date >= ? AND date <= ?')
    .bind(userId, from, to)
    .all<RecordRow>()
  return (rows?.results ?? []).map(shapeKeikoRecord)
}

/** YYYY-MM-DD 形式かどうか。 */
export function isValidDate(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
}
