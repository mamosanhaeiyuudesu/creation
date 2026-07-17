// Fitbitダッシュボードの「アドバイス＆対話」継続スレッド（D1: fitbit_chat_messages）。
// 1ユーザー1スレッドで、アドバイス（kind='advice'）と対話（kind='chat'）を時系列に保存する。
// アドバイスは advice_slot（"YYYY-MM-DD#slot"）で重複防止し、6時間スロットごとに1本だけ自動投稿される。

import type { H3Event } from 'h3'
import type { ThreadMessage, ChatMessage } from '~/types/fitbit'
import { getAppDb } from '~/server/utils/auth'

interface Row {
  id: string; role: string; kind: string; headline: string | null; content: string; advice_slot: string | null; created_at: number
}

const JST_OFFSET_SEC = 9 * 60 * 60

/**
 * アドバイスの並び順の基準時刻（epoch秒）＝対象日のスロット開始時刻（JST）。
 * 過去日の振り返り（slot=-1）は1日を通しての内容なので、その日の終わりに置く。
 * 解釈できない advice_slot は作成時刻にフォールバックする。
 */
function adviceSubjectAt(adviceSlot: string | null, createdAt: number): number {
  const [day, slotStr] = (adviceSlot ?? '').split('#')
  const slot = Number(slotStr)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day ?? '') || !Number.isFinite(slot)) return createdAt
  const jstMidnight = Date.parse(`${day}T00:00:00Z`) / 1000 - JST_OFFSET_SEC
  return jstMidnight + (slot < 0 ? 24 * 60 * 60 - 60 : slot * 6 * 60 * 60)
}

const rowToMsg = (r: Row): ThreadMessage => ({
  id: r.id,
  role: r.role === 'user' ? 'user' : 'assistant',
  kind: r.kind === 'advice' ? 'advice' : 'chat',
  headline: r.headline,
  content: r.content,
  createdAt: r.created_at,
  subjectAt: r.kind === 'advice' ? adviceSubjectAt(r.advice_slot, r.created_at) : r.created_at,
})

/**
 * スレッド全体（対象日の古い順）。既定で直近200件。
 * 取得は作成時刻の新しい順に limit 件、並べ直しは subjectAt で行う（過去日を表示して生成した
 * アドバイスが、作成が新しいというだけでスレッド末尾に来るのを防ぐ）。
 */
export async function listThread(event: H3Event, userId: string, limit = 200): Promise<ThreadMessage[]> {
  const db = getAppDb(event)
  if (!db) return []
  const res = await db
    .prepare('SELECT id, role, kind, headline, content, advice_slot, created_at FROM fitbit_chat_messages WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?')
    .bind(userId, limit)
    .all()
    .catch(() => null)
  const rows = (res?.results ?? []) as unknown as Row[]
  return rows.map(rowToMsg).sort((a, b) => a.subjectAt - b.subjectAt || a.createdAt - b.createdAt)
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
  return { id, role, kind: 'chat', headline: null, content, createdAt, subjectAt: createdAt }
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

/**
 * 指定スロットの既存アドバイスを新しい内容へ差し替える（更新ボタン用）。
 * 行の id・created_at は変えないので、スレッド上の位置はそのまま保たれる。
 * 差し替える行が無ければ false を返す（＝呼び出し側で新規投稿する）。
 */
export async function updateAdviceMessage(event: H3Event, userId: string, adviceSlot: string, headline: string, body: string): Promise<boolean> {
  const db = getAppDb(event)
  if (!db) return false
  const res = await db
    .prepare("UPDATE fitbit_chat_messages SET headline = ?, content = ? WHERE user_id = ? AND advice_slot = ? AND kind = 'advice'")
    .bind(headline, body, userId, adviceSlot)
    .run()
    .catch(() => null)
  return (res?.meta?.changes ?? 0) > 0
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
  return { id, role: 'assistant', kind: 'advice', headline, content: body, createdAt, subjectAt: adviceSubjectAt(adviceSlot, createdAt) }
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
