import { resolveUserId, getStatus } from '~/server/utils/fitbit'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })
  return await getStatus(event, userId)
})
