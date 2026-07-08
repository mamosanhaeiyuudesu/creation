import { resolveUserId, deleteConnection } from '~/server/utils/fitbit'

export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })
  await deleteConnection(event, userId)
  return { ok: true }
})
