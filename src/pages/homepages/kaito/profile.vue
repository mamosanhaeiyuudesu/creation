<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <header class="page-hero-header">
        <div class="page-hero-inner">
          <span class="hero-eyebrow">プロフィール</span>
          <h1>月ノ瀬 海倭について</h1>
          <p>
            私をあなたの心の翻訳器として使ってください。<br />
            声にならない想いに光を当てて、本来の自分を思い出すお手伝いをします。
          </p>
        </div>
      </header>

      <article class="page-wrapper">
        <div class="page-content">
          <section class="profile-section">
            <h2>セラピストになったきっかけ</h2>
            <p>
              離婚を決意した時のことでした。病気の疑いがあり、自分の人生について深く考えるようになりました。
              「自分らしく生きる」とはどういうことなのか。その答えを探し求める中で、大きな決断をすることになりました。
            </p>
            <p>
              そんな時、龍神様との出会いがありました。この出会いが、私の人生を大きく変えることになります。
            </p>
            <p>
              「人の役に立ちたい」という想いが強くなり、メンターとの出会いを経て、
              セラピストとしての道を歩み始めました。
            </p>
          </section>

          <section class="profile-section">
            <h2>私の想い・哲学</h2>
            <blockquote style="border-left: 4px solid var(--color-primary); padding-left: 20px; margin: 24px 0; color: #3d5252; font-style: italic;">
              「平和の祈り」<br />
              我は平和の道具なり
            </blockquote>
            <p>
              子供のキラキラした笑顔のまま大人になってほしい。<br />
              お互いを尊重し合える世界を作りたい。
            </p>
            <p>
              「あなたはそうなのね」「私はこうなのね」<br />
              ただ、それぞれの在り方をそのまま受け取るところから始める。
            </p>
            <p><strong>「私をあなたの心の翻訳器として使ってください」</strong></p>
          </section>

          <section class="profile-section">
            <h2>私の使命</h2>
            <p>鑑定で出たメッセージがあります。</p>
            <div class="callout-box">
              <p>
                言葉にならない想いを代わりに表していく使命。<br />
                声にならない想いに光を当てて気付いてもらう。<br />
                フタをしてしまった想いや感情を解放し、本来の自分を思い出してもらうお手伝い。
              </p>
            </div>
            <p>これが私に与えられた役割だと感じています。</p>
          </section>

          <section class="profile-section">
            <h2>セラピストとしての強み</h2>
            <ul class="episode-list">
              <li><strong>話しやすさ・安心感</strong> — 初めての方でも安心してお話しいただける雰囲気を大切にしています</li>
              <li><strong>ジャッジせず受け止める姿勢</strong> — どんな想いも否定せず、そのまま受け取ります</li>
              <li><strong>しっかり聴くことを大切に</strong> — 吐き出してもらうことで心が解放され、自分の言葉が自分に刺さる瞬間があります</li>
              <li><strong>トラブル解消係、仲を取り持つ役割</strong> — 「怒っている人のところにも行ける」と言われます</li>
            </ul>
            <p style="margin-top: 20px;">
              30年前にジェンダーを打ち明けられた経験もあります。<br />
              どんな話でも、安心してお聞かせください。
            </p>
          </section>

          <section class="profile-section">
            <h2>こんなエピソードも</h2>
            <ul class="episode-list">
              <li>クレーム客と最終的に仲良くなる</li>
              <li>嫌われている上司と仲良くなり、他の人との橋渡しをする</li>
              <li>「居心地をよくしたいのは自分のため」という自然体</li>
            </ul>
            <p style="margin-top: 20px;">
              私は特別なことをしているわけではありません。<br />
              ただ、目の前の人の話をしっかり聴いて、その人の想いを大切にしているだけです。
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
definePageMeta({ layout: 'therapist', alias: ['/kaito/profile'] })

useHead({
  bodyAttrs: { class: 'home' },
  title: '月ノ瀬 海倭について | 月ノ瀬 海倭',
  meta: [{ name: 'description', content: 'セラピスト 月ノ瀬 海倭のプロフィール。セラピストになったきっかけ、想い、使命についてご紹介します。' }],
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
