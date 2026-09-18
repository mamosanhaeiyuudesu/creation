import {
  lookupNikkiOAuthState,
  deleteNikkiOAuthState,
  exchangeNikkiCode,
  saveNikkiGoogleConnection,
} from '~/server/utils/nikki-google'

// Google OAuth2 コールバック。state を D1 から引き当ててユーザーと PKCE verifier を復元し、
// トークン交換→保存する。カレンダーの選択は戻った先の設定画面で行う。
export default defineEventHandler(async (event) => {
  const q = getQuery(event)
  const code = q.code as string
  const state = q.state as string

  try {
    if (!code || !state) throw new Error('認可コード/stateがありません')

    const saved = await lookupNikkiOAuthState(event, state)
    if (!saved) throw new Error('stateがストアに見つかりません（connectが保存できていない可能性）')

    const tok = await exchangeNikkiCode(event, code, saved.verifier)
    await saveNikkiGoogleConnection(event, saved.userId, tok)
    await deleteNikkiOAuthState(event, state)
  } catch (e: any) {
    const detail = e?.data ? (typeof e.data === 'string' ? e.data : JSON.stringify(e.data)) : (e?.message || String(e))
    console.error('[nikki/google/callback] error:', detail)
    await sendRedirect(event, '/nikki?nikki_error=' + encodeURIComponent(String(detail).slice(0, 500)))
    return
  }

  // 連携直後はカレンダーを選ぶ画面を開きたいので、設定を開く印を付けて戻す
  await sendRedirect(event, '/nikki?nikki_setup=1')
})
