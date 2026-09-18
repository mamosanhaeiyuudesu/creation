import { requireNikkiUser, requireNikkiDb, findOwnedTopic, normalizeTopic, updateTopic, loadTopics } from '~/server/utils/nikki'

// トピックの手編集。edited が立つので「作り直す」で消えなくなる。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const id = getRouterParam(event, 'id') ?? ''

  const owned = await findOwnedTopic(db, user.id, id)
  if (!owned) throw createError({ statusCode: 404, message: 'トピックが見つかりません' })

  const body = await readBody<{ headline?: string; detail?: string; impact?: number }>(event)
  const patch = normalizeTopic(body ?? {})
  if (!patch) throw createError({ statusCode: 400, message: '見出しが空です' })

  await updateTopic(event, db, user.id, id, patch)
  return { topics: await loadTopics(event, db, user.id, owned.date) }
})
