import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視され、画像がまるごと出力されない
  dir: {
    public: 'src/public',
  },
  compatibilityDate: '2026-03-12',
  devtools: {
    enabled: true, // または false
    vscode: {},
    //port: 24702
  },
  // devServer: {
  //   port: 24702
  // },
  // vite: {
  //   server: {
  //     allowedHosts: true,
  //     hmr: { port: 24602 },
  //   },
  // },
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
