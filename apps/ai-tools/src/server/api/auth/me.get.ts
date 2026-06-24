import { getSessionUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  if (import.meta.dev) {
    return { id: 'dev-user', username: 'dev' }
  }
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
})
