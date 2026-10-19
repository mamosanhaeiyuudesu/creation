// 端末間の引き継ぎ（同期コード）のサーバー側。コードは推測できない長さのランダム文字列で、
// 知っている人だけが読み書きできる（ログインが無いので、コードが合鍵）。中身は名前・正解数・問題の一覧だけ。
import { SYNC_CODE_LENGTH, sanitizeSyncData, type ManabiSyncData } from '~/utils/manabi-sync'

/** 1つのIPが1日（UTC）に発行できる同期コードの数 */
export const SYNC_DAILY_LIMIT = 10

let ensured: Promise<void> | null = null

/** テーブルを（無ければ）用意する。003_sync.sql と同じ内容。D1 の exec() は使わず prepare().run() で流す */
export function ensureSyncTable(db: any): Promise<void> {
  ensured ??= (async () => {
    await db.prepare(
      `CREATE TABLE IF NOT EXISTS manabi_sync (
        code TEXT PRIMARY KEY, data TEXT NOT NULL, ip_hash TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`
    ).run().catch(() => {})
    await db.prepare(
      'CREATE INDEX IF NOT EXISTS idx_manabi_sync_ip_created ON manabi_sync (ip_hash, created_at)'
    ).run().catch(() => {})
  })().catch((e) => {
    ensured = null
    throw e
  })
  return ensured
}

// ローカルの nuxt dev には D1 が無いので、プロセス内の Map に置く（再起動で消える）
const devStore: Map<string, string> = ((globalThis as any).__manabiSyncStore ??= new Map())

/** 紛らわしい 0/o/1/l/i を抜いた小文字英数 */
export function makeSyncCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(SYNC_CODE_LENGTH))
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
}

export async function loadSync(db: any | null, code: string): Promise<ManabiSyncData | null> {
  let raw: string | null
  if (!db) raw = devStore.get(code) ?? null
  else raw = (await db.prepare('SELECT data FROM manabi_sync WHERE code = ?').bind(code).first())?.data ?? null
  if (raw === null) return null
  try {
    return sanitizeSyncData(JSON.parse(raw))
  } catch {
    return sanitizeSyncData(null)
  }
}

export async function createSync(db: any | null, code: string, data: ManabiSyncData, ipHash: string): Promise<void> {
  if (!db) {
    devStore.set(code, JSON.stringify(data))
    return
  }
  await db
    .prepare('INSERT INTO manabi_sync (code, data, ip_hash) VALUES (?, ?, ?)')
    .bind(code, JSON.stringify(data), ipHash)
    .run()
}

export async function saveSync(db: any | null, code: string, data: ManabiSyncData): Promise<void> {
  if (!db) {
    devStore.set(code, JSON.stringify(data))
    return
  }
  await db
    .prepare("UPDATE manabi_sync SET data = ?, updated_at = datetime('now') WHERE code = ?")
    .bind(JSON.stringify(data), code)
    .run()
}

/** 今日（UTC）すでに上限まで発行していたら 429 を throw する。DBが無い dev では判定しない */
export async function assertUnderSyncLimit(db: any | null, ipHash: string): Promise<void> {
  if (!db) return
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM manabi_sync WHERE ip_hash = ? AND created_at >= date('now')")
    .bind(ipHash)
    .first()
  if ((row?.n ?? 0) >= SYNC_DAILY_LIMIT) {
    throw createError({ statusCode: 429, message: `今日はこれ以上コードを発行できません（1日${SYNC_DAILY_LIMIT}回まで）。` })
  }
}
