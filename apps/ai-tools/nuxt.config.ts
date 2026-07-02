import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  compatibilityDate: '2026-03-12',
  app: {
    head: {
      script: [
        { src: 'https://www.googletagmanager.com/gtag/js?id=G-JRBVTJYCEH', async: true },
        {
          innerHTML: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-JRBVTJYCEH');`,
        },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      meta: [
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'apple-mobile-web-app-title', content: 'AI Tools' },
      ],
    },
  },
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],
  pwa: {
    manifest: false,
    workbox: {
      navigateFallback: null,
      // Web Push（push / notificationclick）ハンドラを追加で読み込む
      // ?v= を上げると sw.js の内容が変わり、iOS でも SW 更新が確実に走る（sw-push.js 変更時は必ず上げる）
      importScripts: ['/sw-push.js?v=7'],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^\/api\//,
          handler: 'NetworkOnly',
        },
      ],
    },
    devOptions: {
      enabled: false,
      type: 'module',
    },
  },
  runtimeConfig: {
    openaiApiKey: '',
    anthropicApiKey: '',
    miyakoVectorStoreId: '',
    vapidPublicKey: '',
    vapidPrivateKey: '',
    vapidSubject: '',
  },
  nitro: {
    preset: 'cloudflare_module',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '0 * * * *': ['mlb-sync'],
      // 15分ごと（各ユーザーが選んだ時刻・分に合わせて送信判定）
      '*/15 * * * *': ['hagemashi-push'],
    },
    devServer: {
      // @ts-ignore — Nitro の型定義に maxBodySize がないが、h3 dev server では有効
      maxBodySize: 100 * 1024 * 1024, // 100MB（大きな音声ファイルの並列アップロード対応）
    },
  },
  devtools: {
    enabled: true,
    vscode: {},
  },
  // devServer: {
  //   port: 24700,
  // },
  // vite: {
  //   server: {
  //     allowedHosts: true,
  //     hmr: { port: 24600 },
  //   },
  // },
});
