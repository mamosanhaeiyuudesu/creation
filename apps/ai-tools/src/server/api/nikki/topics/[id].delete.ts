import { requireNikkiUser, requireNikkiDb, findOwnedTopic, deleteTopic, loadTopics } from '~/server/utils/nikki'

export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const id = getRouterParam(event, 'id') ?? ''

  const owned = await findOwnedTopic(db, user.id, id)
  if (!owned) throw createError({ statusCode: 404, message: 'トピックが見つかりません' })

  await deleteTopic(db, user.id, id)
  return { topics: await loadTopics(event, db, user.id, owned.date) }
})
