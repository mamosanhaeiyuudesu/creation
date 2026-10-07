// API 呼び出しの失敗を画面に出す文言へ変換する。
//
// サーバー側は createError の message に「次に何をすればいいか」を日本語で入れている
// （例:「音が小さくて聞き取れませんでした。…もう一度録音してください」）。
// ここではその message を優先して拾い、無いときだけ当たり障りのない文言に落とす。

export function apiMessage(err: any, fallback = 'うまくいきませんでした。少し時間をおいて、もう一度お試しください。'): string {
  const fromServer = err?.data?.message || err?.data?.statusMessage
  if (typeof fromServer === 'string' && fromServer) return fromServer
  // useAuth が投げる Error（ログインの案内など）はそのまま出してよい
  if (err instanceof Error && err.message) return err.message
  if (typeof err?.message === 'string' && err.message) return err.message
  return fallback
}
