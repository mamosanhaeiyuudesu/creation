// 「よく出る名前」のD1への読み書き。1ユーザー1行、本文は暗号化して持つ（関係者の名前そのものなので）。

import type { H3Event } from 'h3'
import { requireDb, ensureTables } from '~/server/utils/db'
import { encryptText, decryptText } from '~/server/utils/encrypt'
import { parseGlossary } from '~/utils/glossary'

/** 入力欄に出すためのテキストをそのまま返す（1行1語） */
export async function loadGlossaryBody(event: H3Event, userId: string): Promise<string> {
  const db = requireDb(event)
  await ensureTables(db)
  const row = (await db.prepare('SELECT body FROM glossary WHERE user_id = ?').bind(userId).first()) as
    | { body: string }
    | null
  if (!row?.body) return ''
  return await decryptText(event, row.body)
}

/** AIへ渡すための語の配列。登録が無ければ空配列（辞書なしでも動く） */
export async function loadGlossaryTerms(event: H3Event, userId: string): Promise<string[]> {
  return parseGlossary(await loadGlossaryBody(event, userId))
}

/** 入力欄の内容を保存する。保存した時点で正規化した本文を返す（画面に出し直すため） */
export async function saveGlossaryBody(event: H3Event, userId: string, body: string): Promise<string> {
  const db = requireDb(event)
  await ensureTables(db)
  // 保存の時点で正規化しておく（捨てられた行が画面に残り続けると、効いていると誤解させる）
  const normalized = parseGlossary(body).join('\n')
  await db
    .prepare(
      `INSERT INTO glossary (user_id, body, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT (user_id) DO UPDATE SET body = excluded.body, updated_at = datetime('now')`
    )
    .bind(userId, await encryptText(event, normalized))
    .run()
  return normalized
}
