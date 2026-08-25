import { requireKikigakiUser, listRecords } from '~/server/utils/kikigaki'

export default defineEventHandler(async (event) => {
  const user = await requireKikigakiUser(event)
  return { records: await listRecords(event, user.id) }
})
