import { defineNuxtConfig } from 'nuxt/config';
import { SERVICE } from './src/config/service';

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
          href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
        },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    },
  },
  runtimeConfig: {
    // ── サーバー専用（クライアントへは絶対に出さない） ──
    openaiApiKey: '',
    anthropicApiKey: '',
    // 議事録・文字起こしの暗号化鍵（32文字以上）。ai-tools とは別の鍵を使う
    encryptionKey: '',
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
    devServer: {
      // @ts-ignore — Nitro の型定義に maxBodySize は無いが h3 の dev server では有効
      maxBodySize: 100 * 1024 * 1024, // 100MB（分割した音声チャンクの並列アップロード）
    },
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
