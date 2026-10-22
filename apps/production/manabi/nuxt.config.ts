import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public / serverDir は rootDir 相対で解決される。
  // 明示しないと src/public/ と src/server/ が無視される（kikigaki 本番版と同じ罠）
  dir: {
    public: 'src/public',
  },
  serverDir: 'src/server',
  compatibilityDate: '2026-03-12',
  modules: ['@nuxtjs/tailwindcss'],
  app: {
    head: {
      htmlAttrs: { lang: 'ja' },
      titleTemplate: '%s｜マナビー',
      link: [{ key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' },
        // リンクを共有したときの見え方（OGP）。画像の元は design/og.html。画像のURLは絶対URLにすること。
        // 題と説明は問題のページ（pages/[id].vue）で上書きする。画像は全ページ共通
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'マナビー' },
        { key: 'og:title', property: 'og:title', content: 'マナビー — テーマを書くと4択の問題に' },
        { key: 'og:description', property: 'og:description', content: 'テーマを書くと、AIが選択式の問題と解説をつくります。URLを送れば、だれでもすぐ解けます。' },
        { property: 'og:image', content: 'https://manabi.insightlens.jp/og.png' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:locale', content: 'ja_JP' },
        { name: 'twitter:card', content: 'summary_large_image' },
      ],
    },
  },
  runtimeConfig: {
    // サーバー専用（クライアントへは出さない）
    anthropicApiKey: '',
    // お客様の声のメール送信（Resend）。wrangler secret put NUXT_RESEND_API_KEY
    resendApiKey: '',
  },
  nitro: {
    preset: 'cloudflare_module',
  },
  devServer: {
    port: 3010,
  },
  devtools: {
    enabled: true,
    vscode: {},
  },
});
