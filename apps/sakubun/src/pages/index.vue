<template>
  <div class="sk-page">

    <header class="sk-header">
      <div class="sk-header-inner">
        <h1 class="sk-site-name">作文</h1>
        <p class="sk-site-sub">書いたものをまとめています</p>
      </div>
    </header>

    <main>
      <section aria-label="記事一覧">
        <div class="sk-gallery">
          <NuxtLink
            v-for="(article, i) in articles"
            :key="article.id"
            :to="`/articles/${article.id}`"
            class="sk-gallery-item"
          >
            <img
              :src="`/images/${article.id}.png`"
              :alt="article.title"
              :loading="i < 4 ? 'eager' : 'lazy'"
              class="sk-gallery-img"
            />
            <div class="sk-gallery-overlay" aria-hidden="true">
              <span class="sk-gallery-title">{{ article.title }}</span>
              <span v-if="likeCounts[article.id]" class="sk-gallery-likes">
                ♥ {{ likeCounts[article.id] }}
              </span>
            </div>
          </NuxtLink>
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
import { articles } from '~/data/articles'

definePageMeta({ layout: 'sakubun' })

const { data: likeData } = await useFetch<{ counts: Record<string, number> }>('/api/sakubun/likes')
const likeCounts = computed<Record<number, number>>(() => {
  const raw = likeData.value?.counts ?? {}
  const result: Record<number, number> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (v > 0) result[Number(k)] = v
  }
  return result
})

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
