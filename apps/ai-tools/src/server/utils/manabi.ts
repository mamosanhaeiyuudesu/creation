// manabi（まなび）のサーバー共通処理。問題セットの保存・読み出しと、生成回数の上限判定。
// ログイン不要のツールなので、AI代の暴走を防ぐ歯止めは「IPごとの1日あたり生成回数」だけに置いている。
// テーブル名は改名前の osarai_sets のまま（本番に実データがあり、改名しても得るものが無いため）。
import { getAppDb } from '~/server/utils/auth'
import type { ManabiListItem, ManabiQuestion, ManabiSet } from '~/types/manabi'

/** 1つのIPが1日（UTC）に作れる問題セットの数 */
export const MANABI_DAILY_LIMIT = 30
export const MANABI_THEME_MAX = 200
/** 「みんなの問題」で1回に返す件数の上限 */
export const MANABI_LIST_MAX = 50

let ensured: Promise<void> | null = null

/**
 * テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行で文を区切るので複数行の CREATE TABLE が静かに失敗する。prepare().run() で流す。
 * 後から足した列（is_public・deepen）は既存テーブルには ALTER で足す。2回目以降は「列が既にある」で
 * 失敗するだけなので握りつぶし、isolate につき1回しか流さない（毎リクエストの subrequest を増やさないため）。
 */
export function ensureManabiTables(db: any): Promise<void> {
  ensured ??= (async () => {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS osarai_sets (
        id TEXT PRIMARY KEY, theme TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', level TEXT NOT NULL DEFAULT '',
        questions TEXT NOT NULL, ip_hash TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')),
        is_public INTEGER NOT NULL DEFAULT 0, deepen TEXT
      )`
    ).run().catch(() => {})
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_osarai_sets_ip_created ON osarai_sets (ip_hash, created_at)'
    ).run().catch(() => {})
    await db.prepare('ALTER TABLE osarai_sets ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0').run().catch(() => {})
    await db.prepare('ALTER TABLE osarai_sets ADD COLUMN deepen TEXT').run().catch(() => {})
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_osarai_sets_public_created ON osarai_sets (is_public, created_at)'
    ).run().catch(() => {})
  })().catch((e) => {
    ensured = null
    throw e
  })
  return ensured
}

// ── 保存先 ──────────────────────────────
// ローカルの nuxt dev には D1 が無いので、プロセス内の Map に置いて動かす（再起動で消える）。
// 本番は必ず D1。

interface DevEntry {
  set: ManabiSet
  deepen: string[] | null
}
const devStore: Map<string, DevEntry> = ((globalThis as any).__manabiDevStore ??= new Map())

export function getManabiDb(event: any): any | null {
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

export async function saveSet(db: any | null, set: ManabiSet, ipHash: string): Promise<void> {
  if (!db) {
    devStore.set(set.id, { set, deepen: null })
    return
  }
  await db
    .prepare('INSERT INTO osarai_sets (id, theme, title, level, questions, ip_hash, is_public) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(set.id, set.theme, set.title, set.level, JSON.stringify(set.questions), ipHash, set.isPublic ? 1 : 0)
    .run()
}

export async function loadSet(db: any | null, id: string): Promise<ManabiSet | null> {
  if (!db) return devStore.get(id)?.set ?? null
  const row = await db
    .prepare('SELECT id, theme, title, level, questions, created_at, is_public FROM osarai_sets WHERE id = ?')
    .bind(id)
    .first()
  if (!row) return null
  let questions: ManabiQuestion[] = []
  try {
    questions = JSON.parse(row.questions)
  } catch {
    questions = []
  }
  return {
    id: row.id,
    theme: row.theme,
    title: row.title,
    level: row.level,
    questions,
    createdAt: row.created_at,
    isPublic: row.is_public === 1,
  }
}

// ── みんなの問題 ──────────────────────────────

/** 公開された問題セットを新しい順に返す。q があれば題・テーマに含まれるものだけ。問題の中身は読まない。 */
export async function listPublicSets(db: any | null, opts: { limit: number; q?: string }): Promise<ManabiListItem[]> {
  const limit = Math.min(Math.max(Math.floor(opts.limit) || 0, 1), MANABI_LIST_MAX)
  const q = (opts.q ?? '').trim().slice(0, 50)

  if (!db) {
    return [...devStore.values()]
      .map((e) => e.set)
      .filter((s) => s.isPublic && (!q || s.title.includes(q) || s.theme.includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((s) => ({ id: s.id, theme: s.theme, title: s.title, level: s.level, count: s.questions.length, createdAt: s.createdAt }))
  }

  const where = q ? "AND (theme LIKE ? ESCAPE '\\' OR title LIKE ? ESCAPE '\\')" : ''
  const binds: unknown[] = []
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
    binds.push(like, like)
  }
  binds.push(limit)
  const { results } = await db
    .prepare(
      `SELECT id, theme, title, level, created_at, json_array_length(questions) AS n
       FROM osarai_sets WHERE is_public = 1 ${where} ORDER BY created_at DESC LIMIT ?`
    )
    .bind(...binds)
    .all()
  return (results ?? []).map((r: any) => ({
    id: r.id,
    theme: r.theme,
    title: r.title,
    level: r.level,
    count: r.n ?? 0,
    createdAt: r.created_at,
  }))
}

// ── 深掘りの提案（セットごとに1度だけ作ってキャッシュ） ──────────────────────────────

export async function loadDeepen(db: any | null, id: string): Promise<string[] | null> {
  if (!db) return devStore.get(id)?.deepen ?? null
  const row = await db.prepare('SELECT deepen FROM osarai_sets WHERE id = ?').bind(id).first()
  if (!row?.deepen) return null
  try {
    const parsed = JSON.parse(row.deepen)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : null
  } catch {
    return null
  }
}

export async function saveDeepen(db: any | null, id: string, themes: string[]): Promise<void> {
  if (!db) {
    const e = devStore.get(id)
    if (e) e.deepen = themes
    return
  }
  await db.prepare('UPDATE osarai_sets SET deepen = ? WHERE id = ?').bind(JSON.stringify(themes), id).run()
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
  if ((row?.n ?? 0) >= MANABI_DAILY_LIMIT) {
    throw createError({
      statusCode: 429,
      message: `今日はこれ以上問題を作れません（1日${MANABI_DAILY_LIMIT}回まで）。作った問題はそのまま解き直せます。`,
    })
  }
}
