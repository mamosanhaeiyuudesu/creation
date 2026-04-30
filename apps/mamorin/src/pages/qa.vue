<template>
  <div class="mm-page">

    <!-- ヒーロー -->
    <section class="mm-hero">
      <div class="mm-wrap">
        <div class="mm-hero-text">
          <p class="mm-hero-eyebrow">よくある質問</p>
          <h1 class="mm-hero-title">Q&amp;A</h1>
          <p class="mm-hero-sub">セッションを申し込む前に、気になることを確認しておいてください。</p>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="mm-surface">
      <div class="mm-wrap">
        <p class="mm-section-label">FAQ</p>
        <div class="mm-faq-list">
          <div
            v-for="(item, i) in faqs"
            :key="i"
            class="mm-faq-item"
            :class="{ open: openIndex === i }"
          >
            <button class="mm-faq-q" @click="toggle(i)">
              <span class="mm-faq-q-text">{{ item.q }}</span>
              <span class="mm-faq-icon">{{ openIndex === i ? '−' : '+' }}</span>
            </button>
            <div class="mm-faq-a-wrap">
              <div class="mm-faq-a">
                <p v-for="(para, j) in item.a" :key="j" class="mm-story-para" v-html="para" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="mm-cta">
      <div class="mm-wrap">
        <div class="mm-cta-inner">
          <p class="mm-section-label">Contact</p>
          <h2 class="mm-cta-title">他にも気になることがあれば、<br>まず無料相談でお話しください。</h2>
          <p class="mm-cta-desc">初回30分は無料で、お話を聞かせてください。</p>
          <div class="mm-cta-buttons">
            <a class="mm-btn-primary" href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer">
              無料相談フォームへ
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <NuxtLink to="/" class="mm-btn-secondary">トップページへ</NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <footer class="mm-footer">
      <div class="mm-footer-inner">
        <span class="mm-footer-copy">&copy; 2026 自分を許す カウンセリング &amp; セラピー</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mamorin', alias: ['/mamorin/qa'] })

useHead({
  title: 'よくある質問 — カウンセリング & 感情フォーカス・セラピー',
})

const openIndex = ref<number | null>(0)

function toggle(i: number) {
  openIndex.value = openIndex.value === i ? null : i
}

const faqs = [
  {
    q: 'どんな方が対象ですか？',
    a: [
      '主に、父親・母親との関係に長年悩んできた方、自己受容に向き合いたい方を対象にしています。',
      '特に、「親を恨みながら、そんな自分も責めている」という二重の苦しさの中にいる方と、一緒に向き合いたいと考えています。また、父と息子の関係に悩む男性の方にも、特にお力になれると思っています。',
      'カウンセリングや自己啓発に何度か取り組んだけどなかなか変われない、という方も、ぜひ一度お話しください。',
    ],
  },
  {
    q: 'セッションでは何をするのですか？',
    a: [
      'まず「話すこと」から始めます。親との関係、自分への怒り、誰にも言えなかったこと——安心して話せる場を作ることが最初のステップです。',
      '進んでいくなかで、感情を言語化する作業に入ることがあります。感情フォーカス・セラピーでは、「寂しさ」「怒り」「悲しみ」「恥」など、表には出てこない感情に一つひとつ名前をつけていきます。感情を可視化することが、自己受容への入口になります。',
      '何をするかよりも、「何を話してもいい」という感覚を大切にしています。',
    ],
  },
  {
    q: '何回くらい受けたら変化を感じられますか？',
    a: [
      '個人差がありますが、最初の数回で「ここなら話せる」という感覚が生まれることが多いです。5〜10回の継続で、何かしらの変化を感じる方が多い印象です。',
      'ただ、長年のうちに積み重なってきた感情のパターンに向き合うには、時間がかかります。焦りは禁物です。継続パッケージ（5回セット）から始めてみる方が多いです。',
      '初回の無料相談（30分）で、ご自身の状況をお聞きしながら、どんなペースで進めるかを一緒に考えます。',
    ],
  },
  {
    q: 'オンラインでも大丈夫ですか？',
    a: [
      'はい、すべてオンライン（ビデオ通話）での対応です。場所を選ばず、ご自身の安心できる環境から参加できます。',
      'むしろ、オンラインの方が「自分の空間にいながら話せる」ので、話しやすいと感じる方も多いです。',
    ],
  },
  {
    q: '初回の無料相談では何をしますか？',
    a: [
      '30分間、今どんなことで悩んでいるか、どんなことを変えたいかを自由にお話しいただきます。こちらからは、どんなサポートができるかをお伝えします。',
      'この時点で申し込みを決める必要はありません。まず「話してみる」だけで構いません。',
    ],
  },
  {
    q: '心理系の資格を持っていないとのことですが、大丈夫ですか？',
    a: [
      'これは、私自身もずっと考えてきた問いです。',
      '自分の恨みや葛藤を手放すために、たくさんの人のカウンセリングやセラピーを受けてきました。臨床心理士の方、NLPの資格を持つ方、コーチング資格を持つ方など、様々なバックグラウンドを持つ人たちに出会いました。',
      'ですが、自分を一番開放して、本当の意味で理解してくれて、立ち直らせてくれたのは——同じように親との葛藤を抱え、それを乗り越えた経験を持つ人でした。その人は、特に心理系の資格を持っていませんでした。',
      '資格は、知識や技術の証明として大切なものだと思っています。でも、「この人なら話せる」という安心感は、資格ではなく、<strong>同じ場所にいたことのある人間としての共鳴</strong>から来るのだと、私は自分の経験から感じています。',
      '私自身、親との葛藤に長年苦しみ、それを乗り越えてきた。その経験が、自分の一番の武器だと思っています。',
    ],
  },
]
</script>
