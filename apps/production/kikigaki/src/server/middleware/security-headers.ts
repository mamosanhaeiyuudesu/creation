// すべての返答に付けるセキュリティ用のヘッダー（2026-10-17 追加）。
//
// 付けているもの:
//   - frame-ancestors 'none' / X-Frame-Options: ほかのサイトにこの画面を埋め込ませない（クリックジャッキング対策）
//   - object-src 'none' / base-uri 'self': プラグインの読み込みと <base> の差し替えを封じる
//   - X-Content-Type-Options: ファイルの種類の読み違い（スクリプトとして実行される）を防ぐ
//   - Referrer-Policy: 議事録のURL（/records/<id>）を外のサイトへ渡さない
//   - Permissions-Policy: 使わないカメラ・マイク・位置情報をこのサイトでは使えなくする
//   - Strict-Transport-Security: 次からは必ず HTTPS でつなぐ
//
// ★スクリプトの読み込み元を絞る CSP（script-src など）は入れていない。Nuxt が埋め込むインラインの
//   スクリプト、Firebase のログイン（Google のポップアップ・iframe）、Googleドライブの許可画面
//   （accounts.google.com）を壊しやすいため。入れるなら nonce の仕組みを用意し、本番と同じ構成で
//   ログイン・ドライブ保存・Stripe の画面への移動を全部試してからにすること。

export default defineEventHandler((event) => {
  setResponseHeaders(event, {
    'Content-Security-Policy': "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  })
})
