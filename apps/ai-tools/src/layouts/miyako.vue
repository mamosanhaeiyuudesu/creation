<script setup lang="ts">
const { origin } = useRequestURL()

useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap' },
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏝️</text></svg>` },
  ],
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: '宮古議事録 — 宮古島市議会キーワード分析' },
    { property: 'og:description', content: '宮古島市議会の議事録をキーワード・議員・年度別に可視化するAI分析ツール' },
    { property: 'og:image', content: `${origin}/pwa-512.png` },
    { property: 'og:url', content: `${origin}/miyako` },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: '宮古議事録 — 宮古島市議会キーワード分析' },
    { name: 'twitter:description', content: '宮古島市議会の議事録をキーワード・議員・年度別に可視化するAI分析ツール' },
    { name: 'twitter:image', content: `${origin}/pwa-512.png` },
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
.miyako-app .font-mono {
  font-family: 'JetBrains Mono', ui-monospace, 'Cascadia Code', 'Fira Code', monospace;
}
</style>
