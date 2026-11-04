<template>
  <!-- 使い方（設定の「使い方」から開く。議事録が1件もない人のホームにも同じものを出している） -->
  <div class="pt-2">
    <HowToUse />
  </div>
</template>

<script setup lang="ts">
import { SERVICE } from '~/config/service'

useHead({ title: `使い方 — ${SERVICE.name}` })
</script>
