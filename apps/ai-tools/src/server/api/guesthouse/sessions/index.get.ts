import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessions } from '~/server/utils/guesthouse'
import type { SessionListItem } from '~/types/guesthouse'

// 全宿横断のチャット一覧（管理トップの進行中パネル／一覧ページ共通）。
// クエリ: status=active|closed|all（既定all）, houseId=宿で絞り込み, started=1 で未開封を除外, limit=件数上限。
export default defineEventHandler(async (event): Promise<SessionListItem[]> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const q = getQuery(event)
  const statusRaw = String(q.status ?? 'all')
  const status = statusRaw === 'active' || statusRaw === 'closed' ? statusRaw : 'all'
  const houseId = q.houseId ? String(q.houseId) : undefined
  const onlyStarted = String(q.started ?? '') === '1'
  const limit = q.limit ? Math.min(Math.max(Number(q.limit) || 0, 0), 100) || undefined : undefined

  return await loadSessions(event, db, user.id, { status, houseId, onlyStarted, limit })
})
