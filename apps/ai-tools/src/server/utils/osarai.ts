// osarai（おさらい）のサーバー共通処理。問題セットの保存・読み出しと、生成回数の上限判定。
// ログイン不要のツールなので、AI代の暴走を防ぐ歯止めは「IPごとの1日あたり生成回数」だけに置いている。
import { getAppDb } from '~/server/utils/auth'
import type { OsaraiQuestion, OsaraiSet } from '~/types/osarai'

/** 1つのIPが1日（UTC）に作れる問題セットの数 */
export const OSARAI_DAILY_LIMIT = 30
export const OSARAI_THEME_MAX = 200

/**
 * テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行で文を区切るので複数行の CREATE TABLE が静かに失敗する。prepare().run() で流す。
 */
export async function ensureOsaraiTables(db: any): Promise<void> {
  await db.prepare(
    `CREATE TABLE IF NOT EXISTS osarai_sets (
      id TEXT PRIMARY KEY, theme TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', level TEXT NOT NULL DEFAULT '',
      questions TEXT NOT NULL, ip_hash TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  ).run().catch(() => {})
  await db.prepare(
    'CREATE INDEX IF NOT EXISTS idx_osarai_sets_ip_created ON osarai_sets (ip_hash, created_at)'
  ).run().catch(() => {})
}

// ── 保存先 ──────────────────────────────
// ローカルの nuxt dev には D1 が無いので、プロセス内の Map に置いて動かす（再起動で消える）。
// 本番は必ず D1。

const devStore: Map<string, OsaraiSet> = ((globalThis as any).__osaraiDevStore ??= new Map())

export function getOsaraiDb(event: any): any | null {
  return getAppDb(event)
}

/** 共有URLに出すID。紛らわしい 0/O/1/l/I を抜いた英数10文字。 */
export function makeSetId(): string {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export function isValidSetId(id: string): boolean {
  return /^[a-zA-Z0-9]{10}$/.test(id)
}

export async function saveSet(db: any | null, set: OsaraiSet, ipHash: string): Promise<void> {
  if (!db) {
    devStore.set(set.id, set)
    return
  }
  await db
    .prepare('INSERT INTO osarai_sets (id, theme, title, level, questions, ip_hash) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(set.id, set.theme, set.title, set.level, JSON.stringify(set.questions), ipHash)
    .run()
}

export async function loadSet(db: any | null, id: string): Promise<OsaraiSet | null> {
  if (!db) return devStore.get(id) ?? null
  const row = await db
    .prepare('SELECT id, theme, title, level, questions, created_at FROM osarai_sets WHERE id = ?')
    .bind(id)
    .first()
  if (!row) return null
  let questions: OsaraiQuestion[] = []
  try {
    questions = JSON.parse(row.questions)
  } catch {
    questions = []
  }
  return { id: row.id, theme: row.theme, title: row.title, level: row.level, questions, createdAt: row.created_at }
}

// ── 生成回数の上限 ──────────────────────────────

/** 接続元IPのハッシュ。生のIPは保存しない。 */
export async function clientIpHash(event: any): Promise<string> {
  const ip = getRequestHeader(event, 'cf-connecting-ip') || getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`osarai:${ip}`))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

/** 今日（UTC）すでに上限まで作っていたら 429 を throw する。DBが無い dev では判定しない。 */
export async function assertUnderDailyLimit(db: any | null, ipHash: string): Promise<void> {
  if (!db) return
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM osarai_sets WHERE ip_hash = ? AND created_at >= date('now')")
    .bind(ipHash)
    .first()
  if ((row?.n ?? 0) >= OSARAI_DAILY_LIMIT) {
    throw createError({
      statusCode: 429,
      message: `今日はこれ以上問題を作れません（1日${OSARAI_DAILY_LIMIT}回まで）。作った問題はそのまま解き直せます。`,
    })
  }
}
