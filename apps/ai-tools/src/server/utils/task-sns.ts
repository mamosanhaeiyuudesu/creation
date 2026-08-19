// /task の投稿カウンター（Instagram / note）の共通処理。
import { getSessionUser, getAppDb } from '~/server/utils/auth'

export const SNS_PLATFORM_KEYS = ['instagram', 'note'] as const
export type SnsPlatformKey = (typeof SNS_PLATFORM_KEYS)[number]

export interface SnsRow {
  date: string
  platform: SnsPlatformKey
  count: number
}

/**
 * 投稿カウンター用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱うため、CREATE 文は1行で書く。
 */
export async function ensureTaskSnsTables(db: any): Promise<void> {
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS task_sns_posts (user_id TEXT NOT NULL, date TEXT NOT NULL, platform TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (user_id, date, platform))`
    )
    .catch(() => {})
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_task_sns_posts_user ON task_sns_posts(user_id, date)`).catch(() => {})
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireTaskUser(event: any): Promise<{ id: string; username: string }> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無ければ 503 を throw。 */
export function requireTaskDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })
  return db
}

/** 'YYYY-MM-DD' 形式か */
export function isDateKey(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
}
