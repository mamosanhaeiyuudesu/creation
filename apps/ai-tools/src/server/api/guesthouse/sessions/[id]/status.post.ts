import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, setSessionStatus } from '~/server/utils/guesthouse'
import type { SessionStatus } from '~/types/guesthouse'

// チャットをクローズ／再開する（ホスト側）。body: { status: 'active' | 'closed' }。
export default defineEventHandler(async (event): Promise<{ status: SessionStatus }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const body = await readBody<{ status?: string }>(event)
  const status: SessionStatus = body?.status === 'closed' ? 'closed' : 'active'

  const ok = await setSessionStatus(db, user.id, id, status)
  if (!ok) throw createError({ statusCode: 404, message: '会話が見つかりません' })
  return { status }
})
