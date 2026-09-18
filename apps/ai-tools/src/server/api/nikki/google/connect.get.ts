import { requireNikkiUser } from '~/server/utils/nikki'
import {
  generateNikkiCodeVerifier,
  nikkiCodeChallenge,
  buildNikkiAuthorizeUrl,
  saveNikkiOAuthState,
} from '~/server/utils/nikki-google'

// Google OAuth2 認可フロー開始。PKCE verifier と CSRF state を D1 に保存し（Cookie非依存）、
// Google の認可画面へリダイレクトする。callback は state からユーザーを復元する。
export default defineEventHandler(async (event) => {
  const user = await requireNikkiUser(event)

  const verifier = generateNikkiCodeVerifier()
  const challenge = await nikkiCodeChallenge(verifier)
  const state = generateNikkiCodeVerifier().slice(0, 32)

  const url = buildNikkiAuthorizeUrl(event, challenge, state)
  if (!url) throw createError({ statusCode: 500, message: 'Google OAuthの設定（Client ID等）が未構成です' })

  await saveNikkiOAuthState(event, state, user.id, verifier)
  await sendRedirect(event, url)
})
