import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, getOwnedConsult, answerConsult } from '~/server/utils/guesthouse'

// 相談に回答（承認）。編集済みの下書きを確定し、会話スレッドに阪中さん名義で投稿する。
export default defineEventHandler(async (event) => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const consult = await getOwnedConsult(db, user.id, id)
  if (!consult) throw createError({ statusCode: 404, message: '相談が見つかりません' })

  const body = await readBody<{ answer: string }>(event)
  const answer = (body?.answer ?? '').trim()
  if (!answer) throw createError({ statusCode: 400, message: '返信内容を入力してください' })

  await answerConsult(event, db, consult, answer)
  return { ok: true }
})
