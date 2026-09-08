import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public / serverDir は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視されてfavicon等が出力されず、
  // src/server/ も無視されてAPIが1つも生成されない
  dir: {
    public: 'src/public',
  },
  serverDir: 'src/server',
  compatibilityDate: '2026-03-12',
  css: ['~/assets/css/genogram.css'],
  runtimeConfig: {
    // テキスト→JSON解釈(AI)用。ローカルは .env の NUXT_ANTHROPIC_API_KEY、
    // 本番は `wrangler secret put NUXT_ANTHROPIC_API_KEY`
    anthropicApiKey: '',
  },
  nitro: {
    preset: 'cloudflare_module',
  },
  devServer: {
    port: 3008,
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
