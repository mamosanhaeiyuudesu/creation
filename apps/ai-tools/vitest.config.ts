import { defineConfig } from 'vitest/config'

// Nuxt 環境は使わない。純TSのロジック（utils/kendo など）だけをテストする
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
