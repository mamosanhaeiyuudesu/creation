import { resolveUserId, generateCodeVerifier, codeChallenge, buildAuthorizeUrl, saveOAuthState } from '~/server/utils/fitbit'

// Google OAuth2 認可フロー開始。PKCE verifier と CSRF state を D1 に保存し（Cookie非依存）、
// Google の認可画面へリダイレクトする。callback は state から復元するためセッション不要。
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const verifier = generateCodeVerifier()
  const challenge = await codeChallenge(verifier)
  const state = generateCodeVerifier().slice(0, 32)

  const url = buildAuthorizeUrl(event, challenge, state)
  if (!url) throw createError({ statusCode: 500, message: 'Google OAuthの設定（Client ID等）が未構成です' })

  await saveOAuthState(event, state, userId, verifier)
  await sendRedirect(event, url)
})
