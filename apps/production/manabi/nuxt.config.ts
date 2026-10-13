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
      titleTemplate: '%s｜まなび',
      link: [{ key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'format-detection', content: 'telephone=no' },
      ],
    },
  },
  runtimeConfig: {
    // サーバー専用（クライアントへは出さない）
    anthropicApiKey: '',
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
