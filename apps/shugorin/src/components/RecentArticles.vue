<template>
  <section id="articles">
    <div class="sg-wrap">
      <p class="sg-section-label">Articles</p>
      <h2 class="sg-section-title">こんなことを書いてきました</h2>
      <div class="sg-article-grid">
        <a
          v-for="article in articles"
          :key="article.url"
          :href="article.url"
          target="_blank"
          rel="noopener noreferrer"
          class="sg-article-card"
        >
          <p class="sg-article-date">{{ article.date }}</p>
          <h3 class="sg-article-title">{{ article.title }}</h3>
          <p class="sg-article-excerpt">{{ article.excerpt }}</p>
          <span class="sg-article-link">
            続きを読む
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </a>
      </div>
      <div class="sg-article-more">
        <a href="https://note.com/parent_child" target="_blank" rel="noopener noreferrer" class="sg-article-more-link">
          もっと読む（note）
        </a>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const articles = [
  {
    date: '2026.09.22',
    title: '母は「女中」として育てられたのかもしれない',
    excerpt: '風呂掃除をする母の姿から、自分が幼い頃「女中」のような役割を押しつけられていたのではと気づいた話。世代を超えて受け継がれてきた役割意識を掘り下げます。',
    url: 'https://note.com/parent_child/n/n4fb141a598f9',
  },
  {
    date: '2026.09.19',
    title: '"あなたが幸せになることが親孝行"の意味を知る',
    excerpt: '80近くになった母の人生を思いながら、親への責任感や期待と向き合い、「自分が幸せに生きることこそ最大の親孝行」という考えにたどり着くまでの記事。',
    url: 'https://note.com/parent_child/n/nc7a4896aafdb',
  },
]
</script>
