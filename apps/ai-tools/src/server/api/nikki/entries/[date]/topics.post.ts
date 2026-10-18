import {
  requireNikkiUser,
  requireNikkiDb,
  requireDate,
  ensureEntryRow,
  normalizeTopic,
  addTopics,
  loadEntry,
} from '~/server/utils/nikki'

// 重要トピックを自分で1件入れる。AI抽出は通さない。手で入れたものなので edited を立て、「作り直し」で消えないようにする。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)
  const db = await requireNikkiDb(event)
  const date = requireDate(getRouterParam(event, 'date'))

  const body = await readBody<{ headline?: string; detail?: string; impact?: number }>(event)
  const topic = normalizeTopic(body ?? {})
  if (!topic) throw createError({ statusCode: 400, message: '見出しが空です' })

  const entryId = await ensureEntryRow(db, user.id, date)
  await addTopics(event, db, user.id, date, entryId, [topic], true)
  return { entry: await loadEntry(event, db, user.id, date) }
})
