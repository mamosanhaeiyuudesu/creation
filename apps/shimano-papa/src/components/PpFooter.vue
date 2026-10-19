<template>
  <footer class="pp-footer">
    <div class="pp-wrap pp-footer-inner">
      <nav class="pp-footer-links" aria-label="ご契約・規約">
        <NuxtLink to="/terms">ご契約・キャンセルについて</NuxtLink>
        <NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>
        <NuxtLink to="/tokushoho">特定商取引法に基づく表記</NuxtLink>
      </nav>
      <div class="pp-footer-bottom">
        <span>© 人生のインタビュー ／ {{ site.domain }}</span>
        <a :href="site.noteUrl" target="_blank" rel="noopener">聞き手：{{ site.makerName }}（note）</a>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { site } from '~/config/site'
</script>
