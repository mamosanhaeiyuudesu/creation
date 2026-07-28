import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, deleteSession } from '~/server/utils/guesthouse'

// 会話（滞在セッション）を関連データ（メッセージ・相談・日記）ごと削除する。所有者チェック込み。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const ok = await deleteSession(db, user.id, id)
  if (!ok) throw createError({ statusCode: 404, message: '会話が見つかりません' })
  return { ok: true }
})
