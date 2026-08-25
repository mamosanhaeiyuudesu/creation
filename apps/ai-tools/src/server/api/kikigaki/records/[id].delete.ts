import { requireKikigakiUser, deleteRecord } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  const id = getRouterParam(event, 'id') ?? ''
  await deleteRecord(event, user.id, id)
  return { ok: true }
})
