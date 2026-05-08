import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  compatibilityDate: '2026-03-12',
  app: {
    head: {
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
    registerType: 'autoUpdate',
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
      enabled: true,
      type: 'module',
    },
  },
  runtimeConfig: {
    openaiApiKey: '',
    anthropicApiKey: '',
    miyakoVectorStoreId: '',
  },
  nitro: {
    preset: 'cloudflare_module',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      '0 0 * * *': ['mlb-sync'],
      '0 3 * * *': ['mlb-sync'],
      '0 6 * * *': ['mlb-sync'],
      '0 9 * * *': ['mlb-sync'],
      '0 12 * * *': ['mlb-sync'],
      '0 15 * * *': ['mlb-sync'],
      '0 18 * * *': ['mlb-sync'],
      '0 21 * * *': ['mlb-sync'],
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
