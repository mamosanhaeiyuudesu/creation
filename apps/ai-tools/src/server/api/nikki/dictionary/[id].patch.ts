import { requireNikkiUser, requireNikkiDb, loadDictionary, updateDictionaryItem, normalizeDictionaryInput } from '~/server/utils/nikki'

export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const id = getRouterParam(event, 'id') ?? ''
  const body = await readBody<{ word?: unknown; wrong?: unknown }>(event)
  const input = normalizeDictionaryInput(body?.word, body?.wrong)
  if (!input) throw createError({ statusCode: 400, message: '単語を40字以内で入力してください' })
  if (!(await updateDictionaryItem(db, user.id, id, input.word, input.wrong))) {
    throw createError({ statusCode: 404, message: '登録が見つかりません' })
  }
  return { items: await loadDictionary(db, user.id) }
})
