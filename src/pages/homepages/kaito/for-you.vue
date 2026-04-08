<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <header class="page-hero-header">
        <div class="page-hero-inner">
          <span class="hero-eyebrow">こんな方へ</span>
          <h1>こんな方へ</h1>
          <p>
            本当に変わりたいと思っている方へ。<br />
            あなたの想いに寄り添い、本来の自分を思い出すお手伝いをします。
          </p>
        </div>
      </header>

      <article class="page-wrapper">
        <div class="page-content">
          <section class="profile-section">
            <h2>おすすめの方</h2>
            <ul class="target-list">
              <li>本当に変わりたいと思っている方</li>
              <li>現状を変えたい方</li>
              <li>自分らしく生き生きと生きたい方</li>
              <li>人に振り回されない自分になりたい方</li>
              <li>自分の幸せって何か知りたい方</li>
              <li>怒りや憎しみから解放されたい方</li>
              <li>素直に受け取れる方</li>
            </ul>
          </section>

          <section class="profile-section">
            <div class="not-for-you">
              <h3>合わないかもしれない方</h3>
              <ul>
                <li>今のままでいいと思っている方</li>
                <li>人の話を受け取れない方、ジャッジや否定が癖になっている方</li>
                <li>被害者意識が強い方</li>
              </ul>
            </div>
            <p class="note-text">
              ※ただし「入口はどんな状態でも大丈夫。少しずつ変わっていけば、あの時のことが笑い話になる日が来ます」
            </p>
          </section>

          <section class="profile-section">
            <div class="callout-box">
              <h3>心の詰まりを整えませんか？</h3>
              <p>
                家のトイレが壊れたらすぐ直しますよね？<br /><br />
                では、あなたの心が壊れた状態でそのまま生きていきますか？<br /><br />
                トイレをすぐ直すなら、自分の心も整えて快適な状態にして生きていく方がいいですよね。<br /><br />
                今、心をなんとかしたいと思っているなら、<strong>今が行動する時</strong>です。
              </p>
            </div>
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
definePageMeta({ layout: 'therapist', alias: ['/kaito/for-you'] })

useHead({
  bodyAttrs: { class: 'home' },
  title: 'こんな方へ | 月ノ瀬 海倭',
  meta: [{ name: 'description', content: 'セッションがおすすめの方、合わないかもしれない方についてご案内します。' }],
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
