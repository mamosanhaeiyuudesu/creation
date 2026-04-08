<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <header class="page-hero-header">
        <div class="page-hero-inner">
          <span class="hero-eyebrow">お客様の声</span>
          <h1>お客様の声</h1>
          <p>
            セッションやヒーリングを受けられた方々の声をご紹介します。<br />
            感じ方は一人ひとり異なりますが、変化のヒントとしてご覧ください。
          </p>
        </div>
      </header>

      <article class="page-wrapper">
        <div class="page-content">
          <section class="profile-section">
            <h2>FLSセッション体験談</h2>

            <div class="testimonial-list">
              <article class="testimonial-card">
                <h3 style="margin: 0 0 12px; font-size: 1.1rem; color: var(--color-primary-dark);">40代女性</h3>
                <p>
                  「自分がこんなことを思っていたなんて、全く気づいていませんでした。
                  セッションを通じて、ずっと蓋をしていた感情に気づくことができ、
                  涙が止まりませんでした。でもその後、心がとても軽くなりました。」
                </p>
              </article>

              <article class="testimonial-card">
                <h3 style="margin: 0 0 12px; font-size: 1.1rem; color: var(--color-primary-dark);">30代女性</h3>
                <p>
                  「月ノ瀬 海倭さんは本当に話しやすくて、安心して何でも話せました。
                  ジャッジされない、否定されない空間がこんなに心地よいとは思いませんでした。
                  継続して通っていますが、毎回新しい気づきがあります。」
                </p>
              </article>

              <article class="testimonial-card">
                <h3 style="margin: 0 0 12px; font-size: 1.1rem; color: var(--color-primary-dark);">50代女性</h3>
                <p>
                  「人に振り回されることが多かったのですが、セッションを重ねるうちに
                  自分の軸ができてきた感覚があります。
                  以前なら感情的になっていた場面でも、冷静に対応できるようになりました。」
                </p>
              </article>
            </div>
          </section>

          <section class="profile-section">
            <h2>レムリアンヒーリング体験談</h2>

            <div class="testimonial-list">
              <article class="testimonial-card">
                <h3 style="margin: 0 0 12px; font-size: 1.1rem; color: var(--color-primary-dark);">30代女性</h3>
                <p>
                  「ヒーリング中に見えたイメージが、今の自分の状況とリンクしていて驚きました。
                  森の中で子供を育てているような温かいビジョンが見え、
                  自分の中にある優しさを再確認できました。」
                </p>
              </article>

              <article class="testimonial-card">
                <h3 style="margin: 0 0 12px; font-size: 1.1rem; color: var(--color-primary-dark);">40代女性</h3>
                <p>
                  「前世の記憶なのか、海の中を泳いでいるようなイメージが浮かびました。
                  終わった後は体全体がポカポカして、とても穏やかな気持ちになりました。」
                </p>
              </article>
            </div>
          </section>

          <section class="profile-section">
            <h2>ビフォー・アフター</h2>

            <div class="before-after" role="region" aria-label="Before/Afterのエピソード">
              <div>
                <strong>Before</strong>
                <p>
                  職場での人間関係に悩み、毎日が辛かった。
                  誰かに合わせすぎて自分を見失い、「自分の幸せって何だろう」と思っていました。
                  怒りや憎しみを抱えたまま、どうしていいかわからない日々。
                </p>
              </div>
              <div>
                <strong>After</strong>
                <p>
                  セッションを重ねるうちに、自分の本当の気持ちに気づけるようになりました。
                  「こうあるべき」という思い込みを手放し、自分らしく生きる選択ができるように。
                  今では人に振り回されることも減り、穏やかな毎日を送れています。
                </p>
              </div>
            </div>
          </section>

          <section class="profile-section">
            <h2>ご利用にあたって</h2>
            <p>
              感想は個人の体験であり、すべての方に同じ効果を保証するものではありません。
              話したくない内容を無理に引き出すことはありません。
              ペースが合うか不安な方は、まずお気軽にお問い合わせください。
            </p>
          </section>

          <div style="margin-top: 60px; text-align: center;">
            <NuxtLink class="cta-link" to="/kaito/services">サービス内容を見る</NuxtLink>
          </div>
        </div>
      </article>
    </main>

    <TherapistKaitoFooter />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'therapist', alias: ['/kaito/testimonials'] })

useHead({
  bodyAttrs: { class: 'home' },
  title: 'お客様の声 | 月ノ瀬 海倭',
  meta: [{ name: 'description', content: 'FLSセッションやレムリアンヒーリングを受けられたお客様の声をご紹介します。' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap' },
  ],
})
</script>

<style>
@import '~/assets/css/kaito.css';
</style>
