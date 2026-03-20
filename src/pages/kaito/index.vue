<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <section class="home-hero">
        <div class="hero-grid">
          <img class="hero-name-image" src="/images/name.jpg" alt="月ノ瀬 海倭" />
          <div class="hero-text">
            <span class="hero-eyebrow">セラピスト 月ノ瀬 海倭</span>
            <h1>本来の自分を思い出す場所</h1>
            <p class="hero-lead">
              フタをしてしまった想いや感情を解放し、<br />
              あなたが本来持っている輝きを思い出すお手伝いをします。
            </p>
            <div class="hero-copy">
              <p>
                誰かに合わせすぎて疲れてしまった心。<br />
                言葉にできないまま抱えてきた想い。<br />
                「こんなこと思ってはいけない」と、自分で自分を責めてきた時間。
              </p>
              <p>
                ここでは、それらを正そうともしませんし、否定もしません。<br />
                あなたの心の声に、ただ寄り添います。
              </p>
            </div>
            <div class="hero-actions">
              <NuxtLink class="cta-link" to="/kaito/services">サービス内容を見る</NuxtLink>
              <NuxtLink class="secondary-link" to="/kaito/profile">月ノ瀬 海倭について</NuxtLink>
            </div>
          </div>
        </div>
      </section>

      <section class="home-section">
        <div class="section-inner">
          <h2>こんな方へ</h2>
          <ul class="target-list">
            <li>現状を変えたい方</li>
            <li>自分らしく生き生きと生きたい方</li>
            <li>人に振り回されない自分になりたい方</li>
            <li>自分の幸せって何か知りたい方</li>
            <li>怒りや憎しみから解放されたい方</li>
          </ul>
          <div class="section-link-wrap">
            <NuxtLink class="read-more" to="/kaito/for-you">詳しく見る</NuxtLink>
          </div>
        </div>
      </section>

      <section class="home-section glow">
        <div class="section-inner">
          <h2>提供しているサービス</h2>
          <p>
            <strong>FLSセッション（Forcus Light Spirit）</strong><br />
            潜在意識にアクセスし、未来の自分、なりたい自分を見つけるセッションです。
            「私こんなこと思ってたんだ」という気づきと共に、本来の自分を思い出していきます。
          </p>
          <p>
            <strong>レムリアンヒーリング</strong><br />
            ヒーリング中にメッセージやイメージを受け取り、あなたの心の深い部分に光を当てていきます。
            前世の記憶が見えることもあります。
          </p>
          <div class="section-link-wrap">
            <NuxtLink class="read-more" to="/kaito/services">サービス詳細を見る</NuxtLink>
          </div>
        </div>
      </section>

      <section class="home-section message">
        <div class="section-inner">
          <h2>私の想い</h2>
          <p>私は、人に対して『こうあるべき』という物差しを持たず、それぞれの個性を大切にしています。</p>
          <p>どんな気持ちも、どんな過去も、ここでは安全です。</p>
          <p>
            子供のキラキラした笑顔のまま大人になってほしい。<br />
            お互いを尊重し合える世界を作りたい。
          </p>
          <p class="hero-quote">「私をあなたの心の翻訳器として使ってください」</p>
          <p>
            声にならない想いに光を当てて気付いてもらう。<br />
            フタをしてしまった想いや感情を解放し、本来の自分を思い出してもらうお手伝い。<br />
            それが私の使命だと感じています。
          </p>
          <div class="section-link-wrap">
            <NuxtLink class="read-more" to="/kaito/profile">月ノ瀬 海倭について詳しく</NuxtLink>
          </div>
        </div>
      </section>

      <section class="home-cta">
        <div class="section-inner">
          <h2>はじめての方へ</h2>
          <p>
            サービスについて詳しく知りたい方は「サービス内容」へ。<br />
            私の想いや歩みを知りたい方は「月ノ瀬 海倭さんについて」へ。<br />
            実際に受けた方の声は「お客様の声」でご覧いただけます。
          </p>
          <div class="cta-grid">
            <NuxtLink class="cta-card" to="/kaito/services"><span>サービス内容</span></NuxtLink>
            <NuxtLink class="cta-card" to="/kaito/profile"><span>月ノ瀬 海倭さんについて</span></NuxtLink>
            <NuxtLink class="cta-card" to="/kaito/testimonials"><span>お客様の声</span></NuxtLink>
          </div>
        </div>
      </section>
    </main>

    <TherapistKaitoFooter />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'therapist' })

useHead({
  bodyAttrs: { class: 'home' },
  title: '月ノ瀬 海倭 | 本来の自分を思い出す場所',
  meta: [
    { name: 'description', content: '本来の自分を思い出す場所。FLSセッションとレムリアンヒーリングで、あなたの心の声に寄り添います。' },
    { property: 'og:title', content: '月ノ瀬 海倭 | 本来の自分を思い出す場所' },
    { property: 'og:description', content: 'フタをしてしまった想いや感情を解放し、本来の自分を思い出すお手伝いをします。' },
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
    },
  ],
})
</script>

<style>
@import '~/assets/css/kaito.css';
</style>
