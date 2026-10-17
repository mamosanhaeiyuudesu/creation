// D1（kikigaki-db）へのアクセスの入口。
//
// ★ D1 の db.exec() は改行を文の区切りとして扱うため、複数行で書いた CREATE TABLE が
//   エラーも出さずに失敗する（ai-tools で実際に踏んだ罠）。ここでは必ず prepare().run() で
//   1文ずつ流すこと。整形は src/server/db/001_init.sql 側でやる。

import type { H3Event } from 'h3'

/** D1 バインディング。wrangler.toml の [[d1_databases]] と名前を揃える */
const BINDING = 'KIKIGAKI_DB'

export function getDb(event: H3Event): any {
  return (event.context as any).cloudflare?.env?.[BINDING] ?? null
}

/**
 * D1 が無ければ 503。
 * ローカル dev では nuxt dev の cloudflare-dev emulation が miniflare の D1 を自動で用意するので、
 * 通常ここには当たらない（`.wrangler/state/` に作られる）。
 */
export function requireDb(event: H3Event): any {
  const db = getDb(event)
  if (!db) {
    throw createError({
      statusCode: 503,
      message: 'ただいまシステムの調子が悪いようです。少し時間をおいてから、もう一度お試しください。',
    })
  }
  return db
}

/**
 * テーブルを（無ければ）用意する。001_init.sql と同じ内容を持つ保険。
 * 列を足すときは 001_init.sql と両方を直すこと。
 */
export async function ensureTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      display_name TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_login_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email <> ''`,
    `CREATE TABLE IF NOT EXISTS records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      meeting_date TEXT NOT NULL DEFAULT '',
      audio_name TEXT NOT NULL DEFAULT '',
      transcript TEXT NOT NULL DEFAULT '',
      minutes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_records_user ON records (user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS record_tags (
      record_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      tags TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE INDEX IF NOT EXISTS idx_record_tags_user ON record_tags (user_id)`,
    `CREATE TABLE IF NOT EXISTS subscriptions (
      user_id TEXT PRIMARY KEY,
      stripe_customer_id TEXT NOT NULL DEFAULT '',
      stripe_subscription_id TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT '',
      current_period_end TEXT NOT NULL DEFAULT '',
      cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions (stripe_customer_id)`,
    `CREATE TABLE IF NOT EXISTS stripe_events (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT '',
      received_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      pdf_left_max_chars INTEGER NOT NULL DEFAULT 1000,
      pdf_right_max_chars INTEGER NOT NULL DEFAULT 1000,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_grants (
      user_id TEXT PRIMARY KEY,
      free_access INTEGER NOT NULL DEFAULT 0,
      note TEXT NOT NULL DEFAULT '',
      updated_by TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS user_approvals (
      user_id TEXT PRIMARY KEY,
      approved_by TEXT NOT NULL DEFAULT '',
      approved_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS admin_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id TEXT NOT NULL,
      action TEXT NOT NULL,
      target_user_id TEXT NOT NULL DEFAULT '',
      detail TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit (created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS ai_usage_monthly (
      user_id TEXT NOT NULL,
      ym TEXT NOT NULL,
      cost_units INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, ym)
    )`,
  ]
  for (const sql of statements) await db.prepare(sql).run()
}
