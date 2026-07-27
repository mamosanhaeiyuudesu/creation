import { requireGuesthouseDb, ensureGuesthouseTables, loadHouse, loadMessages } from '~/server/utils/guesthouse'
import type { StayThread } from '~/types/guesthouse'

// お客様チャットのスレッド取得（ログイン不要・ポーリング用）。
// share_token で宿を、session クエリでその宿に属するセッションを解決する。
export default defineEventHandler(async (event): Promise<StayThread> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  if (!/^[0-9a-f]{32}$/.test(token)) throw createError({ statusCode: 400, message: '不正なリンクです' })
  const house = await loadHouse(db, { shareToken: token })
  if (!house) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })

  const sessionId = String(getQuery(event).session ?? '')
  if (!/^[0-9a-f]{32}$/.test(sessionId)) return { sessionId: '', guestName: '', messages: [] }

  const row = await db
    .prepare('SELECT id, guest_name FROM guesthouse_sessions WHERE id = ? AND house_id = ?')
    .bind(sessionId, house.id)
    .first<{ id: string; guest_name: string }>()
  if (!row) return { sessionId: '', guestName: '', messages: [] }

  return { sessionId: row.id, guestName: row.guest_name, messages: await loadMessages(db, sessionId) }
})
