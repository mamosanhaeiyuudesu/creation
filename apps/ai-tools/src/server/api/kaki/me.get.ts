import { getKakiUser } from '~/server/utils/kaki'

// ログイン中のユーザー情報（role 付き）。未ログインなら 401。
export default defineEventHandler(async (event) => {
  const user = await getKakiUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
})
