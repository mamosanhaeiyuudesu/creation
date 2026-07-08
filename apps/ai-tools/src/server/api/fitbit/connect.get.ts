import { resolveUserId, generateCodeVerifier, codeChallenge, buildAuthorizeUrl } from '~/server/utils/fitbit'

// Fitbit OAuth2 認可フロー開始。PKCE の verifier と CSRF 用 state を httpOnly Cookie に一時保存し、
// Fitbit の認可画面へリダイレクトする。
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const verifier = generateCodeVerifier()
  const challenge = await codeChallenge(verifier)
  const state = generateCodeVerifier().slice(0, 24)

  const url = buildAuthorizeUrl(event, challenge, state)
  if (!url) throw createError({ statusCode: 500, message: 'Fitbitの設定（Client ID等）が未構成です' })

  const cookieOpts = { httpOnly: true, sameSite: 'lax' as const, secure: true, maxAge: 600, path: '/' }
  setCookie(event, 'fitbit-verifier', verifier, cookieOpts)
  setCookie(event, 'fitbit-state', state, cookieOpts)

  await sendRedirect(event, url)
})
