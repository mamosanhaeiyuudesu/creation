import { defineNuxtConfig } from 'nuxt/config';
import { SERVICE } from './src/config/service';

const OG_DESCRIPTION = '会議の文字起こしを貼り付けるだけ。AIが議事録にまとめ、その場で直して、PDFで配れます。'

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public / serverDir は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視されて favicon 等が出力されず、
  // src/server/ も無視されて API が1つもビルドされない（全エンドポイントが404になる）
  dir: {
    public: 'src/public',
  },
  serverDir: 'src/server',
  compatibilityDate: '2026-03-12',
  modules: ['@nuxtjs/tailwindcss'],
  css: ['~/assets/css/kikigaki.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      link: [
        { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap',
        },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' },
        // リンクを共有したときの見え方（OGP）。画像の元は design/og.html。画像のURLは絶対URLにすること
        { name: 'description', content: OG_DESCRIPTION },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: SERVICE.name },
        { property: 'og:title', content: `${SERVICE.name} — 会議の文章から議事録を` },
        { property: 'og:description', content: OG_DESCRIPTION },
        { property: 'og:url', content: SERVICE.siteUrl },
        { property: 'og:image', content: `${SERVICE.siteUrl}/og.png` },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'ja_JP' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    },
  },
  runtimeConfig: {
    // ── サーバー専用（クライアントへは絶対に出さない） ──
    anthropicApiKey: '',
    // お客様の声のメール送信（Resend）。wrangler secret put NUXT_RESEND_API_KEY
    resendApiKey: '',
    // 議事録・元の文章の暗号化鍵（32文字以上）。ai-tools とは別の鍵を使う
    encryptionKey: '',
    // 管理者の users.id（＝最初にログインしたときの Firebase UID）。カンマ区切り。
    // 管理画面（/admin）を開けて、支払いなしで使える。空なら管理者はいない
    adminUids: '',
    // Stripe（Phase 3）
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePriceId: '',

    public: {
      // Firebase のウェブ設定。公開前提の値なのでクライアントに出してよい
      // （漏れて困るのは秘密鍵であって、API キーはドメイン制限で守る）
      firebaseApiKey: '',
      firebaseAuthDomain: '',
      firebaseProjectId: '',
      // Googleドライブ連携用の OAuth クライアントID（ウェブ）。公開前提の値。空だと連携ボタンは設定未了と案内する
      googleClientId: '',
      // モニター期間のフラグ。既定は src/config/service.ts の値で、
      // NUXT_PUBLIC_MONITOR_MODE=false で有料モードへ切り替わる（コード変更なしで有料化できる）
      monitorMode: SERVICE.monitorMode,
      // 本番URL。マジックリンクの戻り先の組み立てに使う（空ならリクエスト元のoriginを使う）
      siteUrl: SERVICE.siteUrl,
    },
  },
  nitro: {
    preset: 'cloudflare_module',
  },
  devServer: {
    port: 3009,
  },
  devtools: {
    enabled: true,
    vscode: {},
  },
  vite: {
    vue: {
      template: {
        // `<img src="/images/...">` は public 配下のファイルを指す。
        // 既定では絶対パスも import に変換されてしまい、rolldown が解決できずビルドが落ちる
        transformAssetUrls: {
          includeAbsolute: false,
        },
      },
    },
  },
});
