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
    date: '2026.08.29',
    title: '母という名の静かな侵食',
    excerpt: '久しぶりに帰った実家で、80近い両親はほとんど会話をしていなかった。「良い子でいても、二人の仲は良くならなかった」という子どもの頃の経験を、母との関係から見つめ直します。',
    url: 'https://note.com/parent_child/n/ne407556c16eb',
  },
  {
    date: '2026.09.17',
    title: '父が私を東大に行かせたかった本当の理由',
    excerpt: '「最低でも東京理科大に行かなければ、人として認めない」と言った父。その学歴へのこだわりの背景を、祖父母との関係にまで遡って分析します。',
    url: 'https://note.com/parent_child/n/n94cb13a0971a',
  },
  {
    date: '2026.09.19',
    title: '"あなたが幸せになることが親孝行"の意味を知る',
    excerpt: '80近くになった母の人生を思いながら、親への責任感や期待と向き合い、「自分が幸せに生きることこそ最大の親孝行」という考えにたどり着くまでの記事。',
    url: 'https://note.com/parent_child/n/nc7a4896aafdb',
  },
]
</script>
