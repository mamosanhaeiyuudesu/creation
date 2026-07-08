import { resolveUserId, exchangeCode, saveConnection } from '~/server/utils/fitbit'

// Fitbit OAuth2 コールバック。認可コードをトークンに交換して連携レコードを保存し、/fitbit へ戻す。
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string

  const savedState = getCookie(event, 'fitbit-state')
  const verifier = getCookie(event, 'fitbit-verifier')
  if (!code || !state || !verifier || state !== savedState) {
    throw createError({ statusCode: 400, message: '認可の検証に失敗しました' })
  }

  const tok = await exchangeCode(event, code, verifier)
  await saveConnection(event, userId, tok)

  deleteCookie(event, 'fitbit-state', { path: '/' })
  deleteCookie(event, 'fitbit-verifier', { path: '/' })

  await sendRedirect(event, '/fitbit')
})
