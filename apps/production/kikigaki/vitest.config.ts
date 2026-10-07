import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Nuxt 環境は使わない。純TSのロジック（議事録の正規化・利用量の計算・辞書の解析など）だけをテストする。
// Nuxt の `~` エイリアスだけ合わせておく（アプリ側のコードを `~/...` のまま読み込めるようにするため）。
export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
