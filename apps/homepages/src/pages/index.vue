<template>
  <div class="hp-root">
    <main class="hp-wrap">
      <header class="hp-head">
        <h1 class="hp-h1">ホームページ一覧</h1>
        <p class="hp-lead">ローカル開発用のリンク集です。全 {{ pages.length }} サイト。</p>
      </header>

      <div class="hp-grid">
        <a v-for="page in pages" :key="page.url" :href="page.url" class="hp-card">
          <div class="hp-icon">{{ page.icon }}</div>
          <h2 class="hp-name">{{ page.name }}</h2>
          <p class="hp-desc">{{ page.desc }}</p>
          <span class="hp-port">:{{ page.url.split(':').pop() }}</span>
        </a>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'ホームページ一覧',
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏠</text></svg>`
    }
  ]
})

// 上の5つ（先頭行）を優先表示。説明は20文字程度
const pages = [
  { url: 'http://localhost:3002', icon: '🛠️', name: 'prototyper', desc: 'ヒアリング×高速プロトタイプの相談窓口' },
  { url: 'http://localhost:3011', icon: '📊', name: 'data-vis', desc: 'データ可視化の受託制作' },
  { url: 'http://localhost:3003', icon: '🧠', name: 'shugorin', desc: '親子問題専門のカウンセリング' },
  { url: 'http://localhost:3004', icon: '🌊', name: 'kaito', desc: 'セラピスト月ノ瀬 直のページ' },
  { url: 'http://localhost:3007', icon: '🌸', name: '晴レルヤ鍼灸院', desc: '内臓鍼灸・ソフトカイロ矯正' },
  { url: 'http://localhost:3012', icon: '📖', name: '島のパパ', desc: 'インタビューで自伝本をつくる' },
  { url: 'http://localhost:3006', icon: '✍️', name: 'sakubun', desc: '本当の思いを綴る「心の作文」' },
  { url: 'http://localhost:3008', icon: '🧬', name: 'genogram', desc: 'ジェノグラム作成ツール' },
]
</script>

<style scoped>
/* 見た目は apps/production/kikigaki の kikigaki.css に合わせた（青を基調・白い面・細い罫線） */
.hp-root {
  --hp-bg: #f1f6fc;
  --hp-panel: #ffffff;
  --hp-line: #dbe4ef;
  --hp-ink: #1f2a37;
  --hp-ink-soft: #4b5868;
  --hp-ink-faint: #8593a3;
  --hp-accent: #1d6fd6;
  min-height: 100vh;
  padding: 2rem 16px 3rem;
  background: var(--hp-bg);
  color: var(--hp-ink);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.7;
}
.hp-wrap { max-width: 1100px; margin: 0 auto; }
.hp-head { margin-bottom: 1.5rem; }
.hp-h1 { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; }
.hp-lead { margin: 0.25rem 0 0; color: var(--hp-ink-soft); }
.hp-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
@media (min-width: 640px) { .hp-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 1024px) { .hp-grid { grid-template-columns: repeat(5, 1fr); } }
.hp-card {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.4rem;
  padding: 1.1rem 0.75rem;
  background: var(--hp-panel); border: 1px solid var(--hp-line); border-radius: 10px;
  box-shadow: 0 2px 10px rgba(20, 60, 120, 0.06);
  color: inherit; text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.hp-card:hover { border-color: var(--hp-accent); box-shadow: 0 4px 14px rgba(29, 111, 214, 0.14); }
.hp-icon { font-size: 32px; line-height: 1.2; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; }
.hp-name { margin: 0; font-size: 15px; font-weight: 700; }
.hp-card:hover .hp-name { color: var(--hp-accent); }
.hp-desc { margin: 0; font-size: 12px; color: var(--hp-ink-soft); }
.hp-port { font-size: 11px; color: var(--hp-ink-faint); font-family: ui-monospace, monospace; }
</style>
