<template>
  <footer class="pp-footer">
    <div class="pp-wrap pp-footer-inner">
      <nav class="pp-footer-links" aria-label="ご契約・規約">
        <a :href="`${site.mainUrl}/terms`" target="_blank" rel="noopener">ご契約・キャンセルについて</a>
        <a :href="`${site.mainUrl}/privacy`" target="_blank" rel="noopener">プライバシーポリシー</a>
        <a :href="`${site.mainUrl}/tokushoho`" target="_blank" rel="noopener">特定商取引法に基づく表記</a>
        <a :href="site.mainUrl" target="_blank" rel="noopener">人生のインタビュー（本サイト）</a>
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
