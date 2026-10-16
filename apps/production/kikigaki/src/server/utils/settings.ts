// 利用者ごとの設定（user_settings）の読み書き。必ず user_id で絞る。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { defaultUserSettings, normalizeUserSettings } from '~/utils/userSettings'
import type { UserSettings } from '~/types/settings'

export async function loadUserSettings(event: H3Event, userId: string): Promise<UserSettings> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db
    .prepare('SELECT pdf_left_max_chars, pdf_right_max_chars FROM user_settings WHERE user_id = ?')
    .bind(userId)
    .first()) as { pdf_left_max_chars: number; pdf_right_max_chars: number } | null
  // 行が無い＝一度も設定を変えていない人。既定値を返す（行はつくらない）
  if (!row) return defaultUserSettings()
  return normalizeUserSettings({ pdfLeftMaxChars: row.pdf_left_max_chars, pdfRightMaxChars: row.pdf_right_max_chars })
}

export async function saveUserSettings(event: H3Event, userId: string, raw: unknown): Promise<UserSettings> {
  const settings = normalizeUserSettings(raw)
  const db = requireDb(event)
  await ensureTables(db)
  await db
    .prepare(
      `INSERT INTO user_settings (user_id, pdf_left_max_chars, pdf_right_max_chars, updated_at)
       VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         pdf_left_max_chars = excluded.pdf_left_max_chars,
         pdf_right_max_chars = excluded.pdf_right_max_chars,
         updated_at = excluded.updated_at`
    )
    .bind(userId, settings.pdfLeftMaxChars, settings.pdfRightMaxChars)
    .run()
  return settings
}
