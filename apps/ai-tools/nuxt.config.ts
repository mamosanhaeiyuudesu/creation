import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  // Nuxt 4 から dir.public / serverDir は rootDir 相対で解決される。
  // 明示しないと src/public/ が無視されて PWAのmanifest・アイコン・data/ が出力されず、
  // src/server/ も無視されて API が1つもビルドされない（全エンドポイントが404になる）
  dir: {
    public: 'src/public',
  },
  serverDir: 'src/server',
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
      // 共有用のサムネイル（public/og/・ogp-*.png）はSNSが取りに来るだけなので、アプリに先読みさせない（合計数MBある）
      globIgnores: ['og/**', 'ogp-*.png'],
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
    // お客様の声のメール送信（Resend）。wrangler secret put NUXT_RESEND_API_KEY
    resendApiKey: '',
    geminiApiKey: '',
    miyakoVectorStoreId: '',
    encryptionKey: '',
    fitbitClientId: '',
    fitbitClientSecret: '',
    fitbitRedirectUri: '',
    // kikigaki（会議の録音→議事録）Google連携。Docs/Sheets/Tasks/Calendar への書き込み用
    // （fitbit とはスコープが違うので使い回さず、別のOAuthクライアントを発行する）
    kikigakiGoogleClientId: '',
    kikigakiGoogleClientSecret: '',
    kikigakiGoogleRedirectUri: '',
    // nikki（日記）Google連携。カレンダーの**読み取り専用**（calendar.readonly）。
    // kikigaki とはスコープが違うので使い回さず、別のOAuthクライアントを発行する
    nikkiGoogleClientId: '',
    nikkiGoogleClientSecret: '',
    nikkiGoogleRedirectUri: '',
    // palette（FLUX LoRA 画像生成）。fal.ai の API キー。wrangler secret put NUXT_FAL_KEY
    falKey: '',
  },
  routeRules: {
    // manabi は本番サービスに移った（apps/production/manabi）。LINEなどに共有済みのURLは、
    // 旧名（osarai）のものも含めて新しいドメインの同じIDへ送る
    '/manabi': { redirect: { to: 'https://manabi.insightlens.jp/', statusCode: 301 } },
    '/manabi/**': { redirect: { to: 'https://manabi.insightlens.jp/**', statusCode: 301 } },
    '/osarai': { redirect: { to: 'https://manabi.insightlens.jp/', statusCode: 301 } },
    '/osarai/**': { redirect: { to: 'https://manabi.insightlens.jp/**', statusCode: 301 } },
  },
  nitro: {
    preset: 'cloudflare_module',
    experimental: {
      tasks: true,
    },
    scheduledTasks: {
      // wrangler.toml の [triggers] crons と同じ式にすること（片方だけ変えると動かない）
      '0 7 1 * *': ['miyako-trends'], // 毎月1日 UTC 7:00 ＝ JST 16:00（2026-09-18 に mlb-sync の枠を回した。mlb-sync は cron 未登録＝止めてある）
      '0 22 */3 * *': ['news-digest'], // UTC 22:00 ＝ JST 翌朝 7:00、3日に1回（day-of-monthステップでの近似）
      '15 22 */3 * *': ['news-trends'], // UTC 22:15 ＝ JST 翌朝 7:15（news-digestの15分後。subrequest予算を分けるため別呼び出しにしている）、3日に1回
      '0 23 */3 * *': ['farm-news-digest'], // UTC 23:00 ＝ JST 翌朝 8:00、3日に1回（news-digestと時刻をずらしている）
      '15 23 */3 * *': ['farm-news-trends'], // UTC 23:15 ＝ JST 翌朝 8:15（farm-news-digestの15分後、subrequest予算を分けるため別呼び出し）
      // farm-news-archive はcron未登録＝手動実行のみ（Freeプランのcron上限5個に当たったため。wrangler.toml参照）
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
