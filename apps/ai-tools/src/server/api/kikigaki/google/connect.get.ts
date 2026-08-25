import {
  resolveKikigakiUserId,
  generateKikigakiCodeVerifier,
  kikigakiCodeChallenge,
  buildKikigakiAuthorizeUrl,
  saveKikigakiOAuthState,
} from '~/server/utils/kikigaki-google'

// Google OAuth2 認可フロー開始。PKCE verifier と CSRF state を D1 に保存し（Cookie非依存）、
// Google の認可画面へリダイレクトする。callback は state から復元するためセッション不要。
export default defineEventHandler(async (event) => {
  const userId = await resolveKikigakiUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const verifier = generateKikigakiCodeVerifier()
  const challenge = await kikigakiCodeChallenge(verifier)
  const state = generateKikigakiCodeVerifier().slice(0, 32)

  const url = buildKikigakiAuthorizeUrl(event, challenge, state)
  if (!url) throw createError({ statusCode: 500, message: 'Google OAuthの設定（Client ID等）が未構成です' })

  await saveKikigakiOAuthState(event, state, userId, verifier)
  await sendRedirect(event, url)
})
