import {
  requireNikkiUser,
  requireNikkiDb,
  loadDictionary,
  countDictionary,
  addDictionaryItem,
  normalizeDictionaryInput,
  NIKKI_DICTIONARY_MAX,
} from '~/server/utils/nikki'

export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const body = await readBody<{ word?: unknown; wrong?: unknown }>(event)
  const input = normalizeDictionaryInput(body?.word, body?.wrong)
  if (!input) throw createError({ statusCode: 400, message: '単語を40字以内で入力してください' })
  if ((await countDictionary(db, user.id)) >= NIKKI_DICTIONARY_MAX) {
    throw createError({ statusCode: 400, message: `登録できるのは${NIKKI_DICTIONARY_MAX}語までです` })
  }
  await addDictionaryItem(db, user.id, input.word, input.wrong)
  return { items: await loadDictionary(db, user.id) }
})
