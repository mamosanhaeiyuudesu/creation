import {
  requireGuesthouseUser,
  requireGuesthouseDb,
  ensureGuesthouseTables,
  getOwnedHouse,
  createSession,
} from '~/server/utils/guesthouse'
import type { SessionSummary } from '~/types/guesthouse'

// ホストがお客様1人ぶんの会話（滞在）を新規発行する。所有者チェック込み。
// 返す id がお客様URL（/guesthouse/stay/:id）のトークンになる。
export default defineEventHandler(async (event): Promise<SessionSummary> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const house = await getOwnedHouse(db, user.id, id)
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const body = await readBody<{ guestName?: string }>(event).catch(() => ({}) as { guestName?: string })
  const guestName = (body?.guestName ?? '').trim()
  const sessionId = await createSession(event, db, id, guestName)

  return { id: sessionId, guestName, messageCount: 0, hasDiary: false, pendingConsults: 0, updatedAt: '' }
})
