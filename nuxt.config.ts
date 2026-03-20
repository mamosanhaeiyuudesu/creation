import { defineNuxtConfig } from 'nuxt/config';
import vuetify from 'vite-plugin-vuetify';

export default defineNuxtConfig({
  srcDir: 'src',
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
    openaiApiKey: '',        // set via NUXT_OPENAI_API_KEY / wrangler secret put OPENAI_API_KEY
    miyakoVectorStoreId: '', // set via NUXT_MIYAKO_VECTOR_STORE_ID / wrangler secret put MIYAKO_VECTOR_STORE_ID
  },
  nitro: {
    preset: 'cloudflare_module',
  },
});
