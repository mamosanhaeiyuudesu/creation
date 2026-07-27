import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, replaceTips, loadTips } from '~/server/utils/guesthouse'
import type { TipsInput } from '~/types/guesthouse'

// ホスト共通の「旅の情報」を一括置換する。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<TipsInput>(event)
  const tips = Array.isArray(body?.tips) ? body!.tips : []
  await replaceTips(db, user.id, tips)
  return await loadTips(db, user.id)
})
