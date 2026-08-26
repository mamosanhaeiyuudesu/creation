import { requireKikigakiUser, deleteRecord } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  // 記録は全員で共有するが、削除だけはアップロードした本人に限る
  const deleted = await deleteRecord(event, user.id, id)
  if (!deleted) {
    throw createError({ statusCode: 403, message: '削除できるのは、この記録をアップロードした人だけです' })
  }
  return { ok: true }
})
