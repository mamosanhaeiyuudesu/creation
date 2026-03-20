import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  compatibilityDate: '2026-03-12',
  modules: ['@nuxtjs/tailwindcss'],
  runtimeConfig: {
    openaiApiKey: '',
    miyakoVectorStoreId: '',
  },
  nitro: {
    preset: 'cloudflare_module',
  },
});
