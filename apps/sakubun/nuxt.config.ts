import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視され、画像がまるごと出力されない
  dir: {
    public: 'src/public',
  },
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
