import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, updateHearingNote } from '~/server/utils/guesthouse'

// 聞き取りメモを1件編集する（所有者チェック込み）。
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const body = await readBody<{ content: string }>(event)
  const content = String(body?.content ?? '').trim()
  if (!content) throw createError({ statusCode: 400, message: '内容を入力してください' })

  const ok = await updateHearingNote(event, db, user.id, id, content)
  if (!ok) throw createError({ statusCode: 404, message: 'メモが見つかりません' })
  return { ok: true }
})
