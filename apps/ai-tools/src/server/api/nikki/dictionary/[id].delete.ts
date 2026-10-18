import { requireNikkiUser, requireNikkiDb, loadDictionary, deleteDictionaryItem } from '~/server/utils/nikki'

export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  await deleteDictionaryItem(db, user.id, getRouterParam(event, 'id') ?? '')
  return { items: await loadDictionary(db, user.id) }
})
