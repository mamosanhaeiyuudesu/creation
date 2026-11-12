import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
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
        // 本文 Noto Sans JP／見出し Shippori Mincho／英字・数字 Cormorant Garamond（shimano-papa と同じ）
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Shippori+Mincho:wght@600;700;800&family=Cormorant+Garamond:wght@600;700&display=swap',
        },
      ],
    },
  },
  css: ['~/assets/css/ai-consultant.css'],
  devtools: { enabled: true, vscode: {} },
  vite: {
    vue: { template: { transformAssetUrls: { includeAbsolute: false } } },
  },
});
