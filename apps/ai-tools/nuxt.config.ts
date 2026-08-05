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
        { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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
    encryptionKey: '',
    fitbitClientId: '',
    fitbitClientSecret: '',
    fitbitRedirectUri: '',
    // ippon（Sketch2View）3D生成プロバイダ。鍵が無ければ mock にフォールバック。
    ipponProvider: '', // 'tripo' | 'mock'（既定 mock）
    tripoApiKey: '',
  },
  // model-viewer（Web Component）を Vue のカスタム要素として許可する（ippon の3Dビュー）。
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'model-viewer',
    },
  },
  nitro: {
    preset: 'cloudflare_module',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // task-alert は毎時走り、その時刻を送信時刻に設定しているユーザーだけにメールを送る
      '0 * * * *': ['mlb-sync', 'task-alert'],
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
