<template>
  <div class="dv-page">
    <header class="dv-header">
      <div class="dv-wrap dv-header-inner">
        <NuxtLink to="/" class="dv-logo">
          <span class="dv-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <rect x="3" y="17" width="6" height="12" rx="1.5" fill="var(--dv-main)" />
              <rect x="13" y="10" width="6" height="19" rx="1.5" fill="var(--dv-main)" />
              <rect x="23" y="4" width="6" height="25" rx="1.5" fill="var(--dv-accent)" />
            </svg>
          </span>
          <span class="dv-logo-text">
            <span class="dv-logo-name">data-vis</span>
            <span class="dv-logo-sub">眠っているデータを、伝わる形に</span>
          </span>
        </NuxtLink>
      </div>
    </header>

    <main class="dv-legal">
      <div class="dv-wrap dv-wrap-narrow">
        <h1 class="dv-title">特定商取引法に基づく表記</h1>
        <dl class="dv-legal-list">
          <div v-for="row in site.legal" :key="row.label" class="dv-legal-row">
            <dt>{{ row.label }}</dt>
            <dd>{{ row.value }}</dd>
          </div>
        </dl>
        <NuxtLink to="/" class="dv-text-link dv-legal-back">← トップに戻る</NuxtLink>
      </div>
    </main>

    <footer class="dv-footer">
      <div class="dv-wrap dv-footer-inner">
        <span>© data-vis ／ {{ site.domain }}</span>
        <a :href="site.prototyperUrl" target="_blank" rel="noopener">運営：prototyper</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'data-vis' })

useHead({
  title: '特定商取引法に基づく表記 | data-vis',
  htmlAttrs: { lang: 'ja' },
  meta: [{ name: 'robots', content: 'noindex' }],
})
</script>

<style>
@import '~/assets/css/data-vis.css';
</style>
