import { getSessionUser } from '~/server/utils/auth'
import {
  lookupKikigakiOAuthState,
  deleteKikigakiOAuthState,
  exchangeKikigakiCode,
  saveKikigakiGoogleConnection,
} from '~/server/utils/kikigaki-google'

// Google OAuth2 コールバック。state を D1 から引き当ててユーザーと PKCE verifier を復元し、
// トークン交換 → 議事録一覧スプレッドシート作成（初回のみ）→ 保存する。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string

  try {
    if (!code || !state) throw new Error('認可コード/stateがありません')

    const saved = await lookupKikigakiOAuthState(event, state)
    if (!saved) throw new Error('stateがストアに見つかりません（connectが保存できていない可能性）')

    const tok = await exchangeKikigakiCode(event, code, saved.verifier)
    const user = await getSessionUser(event)
    await saveKikigakiGoogleConnection(event, saved.userId, tok, user?.username ?? 'あなた')
    await deleteKikigakiOAuthState(event, state)
  } catch (e: any) {
    const detail = e?.data ? (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : e?.message || String(e)
    console.error('[kikigaki/google/callback] error:', detail)
    await sendRedirect(event, '/kikigaki?kikigaki_error=' + encodeURIComponent(String(detail).slice(0, 500)))
    return
  }

  await sendRedirect(event, '/kikigaki')
})
