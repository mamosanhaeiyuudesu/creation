<script setup lang="ts">
const { origin } = useRequestURL()

useHead({
  meta: [
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: 'MLB日本人選手成績' },
    { property: 'og:description', content: '大谷翔平・山本由伸・今永昇太ら日本人MLB選手のリアルタイム成績をチェック' },
    { property: 'og:image', content: `${origin}/apple-touch-icon-mlb.png` },
    { property: 'og:url', content: `${origin}/japanese-mlb-player` },
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:title', content: 'MLB日本人選手成績' },
    { name: 'twitter:description', content: '大谷翔平・山本由伸・今永昇太ら日本人MLB選手のリアルタイム成績をチェック' },
    { name: 'twitter:image', content: `${origin}/apple-touch-icon-mlb.png` },
  ],
})
</script>

<template>
  <div class="h-screen overflow-hidden flex flex-col bg-slate-50">
    <slot />
  </div>
</template>
