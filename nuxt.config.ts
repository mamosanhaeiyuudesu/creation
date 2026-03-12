import { defineNuxtConfig } from 'nuxt/config';
import vuetify from 'vite-plugin-vuetify';

export default defineNuxtConfig({
  compatibilityDate: '2026-03-12',
  css: ['vuetify/styles'],
  build: {
    transpile: ['vuetify'],
  },
  vite: {
    plugins: [vuetify({ autoImport: true })],
    define: {
      'process.env.DEBUG': false,
    },
  },
  runtimeConfig: {
    openaiApiKey: '', // 値は入れない
  },
  nitro: {
    preset: 'cloudflare_module',
  },
});
