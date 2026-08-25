import { requireKikigakiUser, getRecord } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  const record = await getRecord(event, user.id, id)
  if (!record) throw createError({ statusCode: 404, message: '記録が見つかりません' })
  return record
})
