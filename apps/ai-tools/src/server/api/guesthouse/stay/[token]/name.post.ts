import { requireGuesthouseDb, ensureGuesthouseTables, loadStaySession, updateGuestNameIfChanged } from '~/server/utils/guesthouse'

// お客様が自分の名前を更新する（ログイン不要・自分の滞在セッションのみ）。
// メッセージ送信を待たずに管理側へ名前を反映させるため。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  const resolved = await loadStaySession(db, token)
  if (!resolved) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })

  const body = await readBody<{ guestName?: string }>(event)
  await updateGuestNameIfChanged(event, db, resolved.session, body?.guestName)
  return { ok: true }
})
