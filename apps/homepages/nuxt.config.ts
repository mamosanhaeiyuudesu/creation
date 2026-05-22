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
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },
  modules: ['@nuxtjs/tailwindcss'],
  devtools: {
    enabled: true, // または false
    vscode: {},
  },
  // devServer: {
  //   port: 24701
  // },
  // vite: {
  //   server: {
  //     allowedHosts: true,
  //     hmr: { port: 24601 },
  //   },
  // },
});
