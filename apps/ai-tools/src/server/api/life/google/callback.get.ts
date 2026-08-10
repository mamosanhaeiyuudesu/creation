import { getSessionUser } from '~/server/utils/auth'
import { lookupLifeOAuthState, deleteLifeOAuthState, exchangeLifeCode, saveLifeGoogleConnection } from '~/server/utils/life-google'

// Google OAuth2 コールバック。state を D1 から引き当ててユーザーと PKCE verifier を復元し、
// トークン交換→スプレッドシート作成（初回のみ）→保存する。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string

  try {
    if (!code || !state) throw new Error('認可コード/stateがありません')

    const saved = await lookupLifeOAuthState(event, state)
    if (!saved) throw new Error('stateがストアに見つかりません（connectが保存できていない可能性）')

    const tok = await exchangeLifeCode(event, code, saved.verifier)
    const user = await getSessionUser(event)
    await saveLifeGoogleConnection(event, saved.userId, tok, user?.username ?? 'あなた')
    await deleteLifeOAuthState(event, state)
  } catch (e: any) {
    const detail = e?.data ? (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : (e?.message || String(e))
    console.error('[life/google/callback] error:', detail)
    await sendRedirect(event, '/life?life_error=' + encodeURIComponent(String(detail).slice(0, 500)))
    return
  }

  await sendRedirect(event, '/life')
})
