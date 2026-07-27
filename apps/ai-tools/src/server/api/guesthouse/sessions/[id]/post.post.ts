import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, addMessage } from '~/server/utils/guesthouse'

// 阪中さんが会話スレッドに直接メッセージを投稿する（お礼メッセージの送信など）。F3。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const body = await readBody<{ content: string }>(event)
  const content = (body?.content ?? '').trim()
  if (!content) throw createError({ statusCode: 400, message: 'メッセージを入力してください' })

  await addMessage(db, id, 'host', content, 'reply')
  return { ok: true }
})
