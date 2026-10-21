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
      htmlAttrs: { lang: 'ja' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        // 本文 = Noto Sans JP。見出しの「やさしさゴシック」は Google Fonts に無いため、
        // 未インストール環境向けのフォールバックとして M PLUS Rounded 1c を読む（assets/css/kaito2.css の @font-face 参照）
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=M+PLUS+Rounded+1c:wght@500;700&display=swap',
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
