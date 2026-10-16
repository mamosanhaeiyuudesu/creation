import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視され、画像がまるごと出力されない
  dir: {
    public: 'src/public',
  },
  compatibilityDate: '2026-03-12',
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // 本文は Noto Sans JP、見出しは本らしさを出すため明朝（Shippori Mincho）、英字・数字は Cormorant Garamond
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap',
        },
      ],
    },
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
