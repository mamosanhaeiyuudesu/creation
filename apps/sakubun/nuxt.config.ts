import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public / serverDir は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視されて画像が出力されず、
  // src/server/ も無視されて API が1つもビルドされない（全エンドポイントが404になる）
  dir: {
    public: 'src/public',
  },
  serverDir: 'src/server',
  compatibilityDate: '2026-03-12',
  devServer: {
    port: 3006,
  },
  devtools: {
    enabled: false,
  },
  nitro: {
    preset: 'cloudflare_module',
  },
});
