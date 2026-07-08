import { consumeOAuthState, exchangeCode, saveConnection } from '~/server/utils/fitbit'

// Google OAuth2 コールバック。Googleからの別サイト遷移でセッションCookieが届かないため、
// state を D1 から引き当ててユーザーと PKCE verifier を復元し、トークン交換→保存する。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string
  if (!code || !state) throw createError({ statusCode: 400, message: '認可コードが不正です' })

  const saved = await consumeOAuthState(event, state)
  if (!saved) throw createError({ statusCode: 400, message: '認可の検証に失敗しました（stateが見つかりません）' })

  const tok = await exchangeCode(event, code, saved.verifier)
  await saveConnection(event, saved.userId, tok)

  await sendRedirect(event, '/fitbit')
})
