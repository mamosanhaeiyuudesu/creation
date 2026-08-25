import { resolveKikigakiUserId, getKikigakiGoogleStatus } from '~/server/utils/kikigaki-google'

export default defineEventHandler(async (event) => {
  const userId = await resolveKikigakiUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })
  return await getKikigakiGoogleStatus(event, userId)
})
