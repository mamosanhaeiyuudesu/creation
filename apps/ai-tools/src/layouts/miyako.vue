<script setup lang="ts">
const { origin } = useRequestURL()

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏝️</text></svg>` },
  ],
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: '宮古議事録 — 宮古島市議会キーワード分析' },
    { property: 'og:description', content: '宮古島市議会の議事録をキーワード・議員・年度別に可視化するAI分析ツール' },
    { property: 'og:image', content: `${origin}/ogp-miyako.png` },
    { property: 'og:url', content: `${origin}/miyako` },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: '宮古議事録 — 宮古島市議会キーワード分析' },
    { name: 'twitter:description', content: '宮古島市議会の議事録をキーワード・議員・年度別に可視化するAI分析ツール' },
    { name: 'twitter:image', content: `${origin}/ogp-miyako.png` },
  ],
})
</script>

<template>
  <div class="flex flex-col h-screen miyako-app">
    <main class="flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
      <slot />
    </main>
  </div>
</template>

<style>
/*
 * 見た目はキキガキ本番版（apps/production/kikigaki/src/assets/css/kikigaki.css）に合わせている。
 * 白い面＋青（#1d6fd6）を基調にし、オレンジは目立たせたい1か所（新しく出てきた話題・選んだ語）だけに使う。
 */
.miyako-app {
  color: #1f2a37;
  background: #f1f6fc;
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
/* 数字の桁がそろうように、等幅の代わりに等幅数字にする */
.miyako-app .font-mono {
  font-family: inherit;
  font-variant-numeric: tabular-nums;
}
.miyako-app :focus-visible {
  outline: 2px solid #1d6fd6;
  outline-offset: 2px;
}
</style>
