import { requireGuesthouseDb, ensureGuesthouseTables, loadStaySession, loadMessages } from '~/server/utils/guesthouse'
import { decryptComment } from '~/server/utils/encrypt'
import type { StayThread } from '~/types/guesthouse'

// お客様チャットのスレッド取得（ログイン不要・ポーリング用）。
// token はお客様1人ぶんの滞在セッションのトークン。トークンから宿とセッションを解決する。
export default defineEventHandler(async (event): Promise<StayThread> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  const resolved = await loadStaySession(db, token)
  if (!resolved) return { sessionId: '', guestName: '', messages: [] }
  const { session } = resolved

  return {
    sessionId: session.id,
    guestName: await decryptComment(event, session.guest_name ?? ''),
    messages: await loadMessages(event, db, session.id),
  }
})
