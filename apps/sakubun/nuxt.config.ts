import { defineNuxtConfig } from 'nuxt/config';

export default defineNuxtConfig({
  srcDir: 'src',
  compatibilityDate: '2026-03-12',
  devServer: {
    port: 3006,
  },
  devtools: {
    enabled: false,
  },
});
