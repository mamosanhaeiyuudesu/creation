// Fitbitダッシュボードの「アドバイス＆対話」継続スレッド（D1: fitbit_chat_messages）。
// 1ユーザー1スレッドで、アドバイス（kind='advice'）と対話（kind='chat'）を時系列に保存する。
// アドバイスは advice_slot（"YYYY-MM-DD#slot"）で重複防止し、6時間スロットごとに1本だけ自動投稿される。

import type { H3Event } from 'h3'
import type { ThreadMessage, ChatMessage } from '~/types/fitbit'
import { getAppDb } from '~/server/utils/auth'

interface Row {
  id: string; role: string; kind: string; headline: string | null; content: string; created_at: number
}

const rowToMsg = (r: Row): ThreadMessage => ({
  id: r.id,
  role: r.role === 'user' ? 'user' : 'assistant',
  kind: r.kind === 'advice' ? 'advice' : 'chat',
  headline: r.headline,
  content: r.content,
  createdAt: r.created_at,
})

/** スレッド全体（古い順）。既定で直近200件。 */
export async function listThread(event: H3Event, userId: string, limit = 200): Promise<ThreadMessage[]> {
  const db = getAppDb(event)
  if (!db) return []
  const res = await db
    .prepare('SELECT id, role, kind, headline, content, created_at FROM fitbit_chat_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .bind(userId, limit)
    .all()
    .catch(() => null)
  const rows = (res?.results ?? []) as unknown as Row[]
  return rows.map(rowToMsg).reverse() // 古い順に戻す
}

/** 対話メッセージを1件追記して返す。 */
export async function appendChatMessage(event: H3Event, userId: string, role: 'user' | 'assistant', content: string): Promise<ThreadMessage> {
  const id = crypto.randomUUID()
  const createdAt = Math.floor(Date.now() / 1000)
  const db = getAppDb(event)
  if (db) {
    await db
      .prepare(`INSERT INTO fitbit_chat_messages (id, user_id, role, kind, headline, content, advice_slot, created_at)
                VALUES (?, ?, ?, 'chat', NULL, ?, NULL, ?)`)
      .bind(id, userId, role, content, createdAt)
      .run()
  }
  return { id, role, kind: 'chat', headline: null, content, createdAt }
}

/** 指定スロットのアドバイスが既にあれば返す（無ければ null）。 */
export async function findAdviceMessage(event: H3Event, userId: string, adviceSlot: string): Promise<ThreadMessage | null> {
  const db = getAppDb(event)
  if (!db) return null
  const row = await db
    .prepare('SELECT id, role, kind, headline, content, created_at FROM fitbit_chat_messages WHERE user_id = ? AND advice_slot = ?')
    .bind(userId, adviceSlot)
    .first()
    .catch(() => null)
  return row ? rowToMsg(row as unknown as Row) : null
}

/** アドバイスをスレッドへ投稿（重複時は無視）して返す。 */
export async function insertAdviceMessage(event: H3Event, userId: string, adviceSlot: string, headline: string, body: string): Promise<ThreadMessage> {
  const id = crypto.randomUUID()
  const createdAt = Math.floor(Date.now() / 1000)
  const db = getAppDb(event)
  if (db) {
    await db
      .prepare(`INSERT OR IGNORE INTO fitbit_chat_messages (id, user_id, role, kind, headline, content, advice_slot, created_at)
                VALUES (?, ?, 'assistant', 'advice', ?, ?, ?, ?)`)
      .bind(id, userId, headline, body, adviceSlot, createdAt)
      .run()
    // 競合で無視された場合は既存を返す
    const existing = await findAdviceMessage(event, userId, adviceSlot)
    if (existing) return existing
  }
  return { id, role: 'assistant', kind: 'advice', headline, content: body, createdAt }
}

/** スレッドを Claude 会話用 messages に変換（advice は assistant 発言として合成）。直近 maxTurns 件。 */
export function toConversation(thread: ThreadMessage[], maxTurns = 20): ChatMessage[] {
  return thread
    .slice(-maxTurns)
    .map(m => ({
      role: m.role,
      content: m.kind === 'advice' ? `${m.headline ?? ''}\n\n${m.content}`.trim() : m.content,
    }))
}
