import { getDeepheartUser } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await getDeepheartUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
})
