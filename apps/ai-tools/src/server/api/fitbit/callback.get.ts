import { lookupOAuthState, deleteOAuthState, exchangeCode, saveConnection } from '~/server/utils/fitbit'

// Google OAuth2 コールバック。state を D1 から引き当ててユーザーと PKCE verifier を復元し、
// トークン交換→保存する。エラーは握りつぶさず /fitbit?fitbit_error= に載せて可視化する。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string

  try {
    if (!code || !state) throw new Error('認可コード/stateがありません')

    const saved = await lookupOAuthState(event, state)
    if (!saved) throw new Error('stateがストアに見つかりません（connectが保存できていない可能性）')

    const tok = await exchangeCode(event, code, saved.verifier)
    await saveConnection(event, saved.userId, tok)
    await deleteOAuthState(event, state)
  } catch (e: any) {
    // ofetch のエラーは e.data に Google のレスポンス本文が入る
    const detail = e?.data ? (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : (e?.message || String(e))
    console.error('[fitbit/callback] error:', detail)
    await sendRedirect(event, '/fitbit?fitbit_error=' + encodeURIComponent(String(detail).slice(0, 500)))
    return
  }

  await sendRedirect(event, '/fitbit')
})
