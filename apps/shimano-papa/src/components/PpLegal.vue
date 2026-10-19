<template>
  <!-- ご契約・プライバシーポリシー・特商法表記の各ページで使う共通の枠 -->
  <div class="pp-page">
    <header class="pp-header">
      <div class="pp-wrap pp-header-inner">
        <NuxtLink to="/" class="pp-logo">
          <span class="pp-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <path d="M16 8 C 12 5, 6 5, 3 6 V 26 C 6 25, 12 25, 16 28 Z" fill="var(--pp-main)" />
              <path d="M16 8 C 20 5, 26 5, 29 6 V 26 C 26 25, 20 25, 16 28 Z" fill="var(--pp-accent)" />
            </svg>
          </span>
          <span class="pp-logo-text">
            <span class="pp-logo-name">人生のインタビュー</span>
            <span class="pp-logo-sub">LIFE INTERVIEW</span>
          </span>
        </NuxtLink>
        <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-legal-cta">{{ site.ctaLabel }}</a>
      </div>
    </header>

    <main class="pp-legal">
      <div class="pp-wrap pp-wrap-narrow">
        <h1 class="pp-legal-title">{{ title }}</h1>
        <slot />
        <p class="pp-legal-back"><NuxtLink to="/" class="pp-text-link">← トップページへ戻る</NuxtLink></p>
      </div>
    </main>

    <PpFooter />
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

const props = defineProps<{ title: string }>()

useHead({
  title: `${props.title} | 人生のインタビュー`,
  htmlAttrs: { lang: 'ja' },
})
</script>

<style>
@import '~/assets/css/shimano-papa.css';
</style>
