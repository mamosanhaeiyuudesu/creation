<template>
  <div class="sk-page">

    <header class="sk-header">
      <div class="sk-header-inner">
        <h1 class="sk-site-name">作文</h1>
        <p class="sk-site-sub">書いたものをまとめています</p>
      </div>
    </header>

    <main>
      <section class="sk-hero">
        <div class="sk-wrap">
          <p class="sk-hero-label">About</p>
          <p class="sk-hero-desc">
            日々考えていること、感じたことを文章にしています。
          </p>
        </div>
      </section>

      <section class="sk-articles">
        <div class="sk-wrap">
          <p class="sk-section-label">Articles</p>
          <div class="sk-article-list">
            <p style="font-family: var(--f-sans); font-size: 14px; color: var(--c-text-dim); padding: 20px;">
              まだ記事がありません。
            </p>
          </div>
        </div>
      </section>
    </main>

    <footer class="sk-footer">
      <div class="sk-footer-inner">
        <span>&copy; 2026 作文</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'sakubun' })

useHead({
  title: '作文',
  meta: [
    { name: 'description', content: '書いたものをまとめています。' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>✍</text></svg>` },
  ],
})
</script>

<style>
/* */
</style>
