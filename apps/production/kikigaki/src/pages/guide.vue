<template>
  <!-- 使い方（設定の「使い方」から開く。議事録が1件もない人のホームにも同じものを出している） -->
  <div class="kk-guide">
    <HowToUse />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

definePageMeta({ center: true })
useHead({ title: `使い方 — ${SERVICE.name}` })
</script>

<style scoped>
/* 左メニューを除いた画面のまん中に置く（スマホは上から並べる） */
.kk-guide {
  padding-top: 0.5rem;
}
@media (min-width: 1024px) {
  .kk-guide {
    min-height: calc(100dvh - 3rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0 2rem;
  }
}
</style>
