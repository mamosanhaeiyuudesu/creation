<template>
  <div class="mamorin-page">

    <!-- HERO -->
    <div class="container">
      <section class="hero section">
        <p class="hero-eyebrow">よくある質問</p>
        <h1 class="hero-title serif">
          Q&amp;A
        </h1>
        <p class="hero-sub">
          セッションを申し込む前に、気になることを確認しておいてください。
        </p>
      </section>
    </div>

    <!-- FAQ -->
    <div class="container">
      <section class="section">
        <div class="faq-list">
          <div
            v-for="(item, i) in faqs"
            :key="i"
            class="faq-item"
            :class="{ open: openIndex === i }"
          >
            <button class="faq-q" @click="toggle(i)">
              <span class="faq-q-text serif">{{ item.q }}</span>
              <span class="faq-icon">{{ openIndex === i ? '−' : '+' }}</span>
            </button>
            <div class="faq-a-wrap">
              <div class="faq-a">
                <p v-for="(para, j) in item.a" :key="j" class="story-para" v-html="para" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- CTA -->
    <div class="container">
      <section class="section">
        <div class="cta-section" style="padding: 2rem 0 4rem;">
          <h2 class="cta-title serif">
            他にも気になることがあれば、<br>
            まず無料相談でお話しください。
          </h2>
          <p class="cta-sub">初回30分は無料で、お話を聞かせてください。</p>
          <a class="cta-btn" href="/mamorin">カウンセリングについて見る</a>
        </div>
      </section>
    </div>

    <footer>
      <p>&copy; 2025 自分を許す カウンセリング &amp; セラピー</p>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mamorin' })

useHead({
  title: 'よくある質問 — カウンセリング & 感情フォーカス・セラピー',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&family=Noto+Sans+JP:wght@300;400;500&display=swap',
    },
  ],
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

<style>
.mamorin-page {
  --bg: #faf9f7;
  --bg-card: #ffffff;
  --bg-muted: #f4f2ee;
  --text: #1a1916;
  --text-secondary: #5a5854;
  --text-tertiary: #9a9890;
  --border: rgba(26, 25, 22, 0.1);
  --border-strong: rgba(26, 25, 22, 0.2);
  --accent: #3a3630;

  font-family: 'Noto Sans JP', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.8;
  font-size: 15px;
  box-sizing: border-box;
}

.mamorin-page *, .mamorin-page *::before, .mamorin-page *::after { box-sizing: border-box; }

@media (prefers-color-scheme: dark) {
  .mamorin-page {
    --bg: #111110;
    --bg-card: #1a1916;
    --bg-muted: #222120;
    --text: #f0ede8;
    --text-secondary: #a09d98;
    --text-tertiary: #666360;
    --border: rgba(240, 237, 232, 0.1);
    --border-strong: rgba(240, 237, 232, 0.2);
    --accent: #d4d0c8;
  }
}

.mamorin-page .serif { font-family: 'Noto Serif JP', serif; }

.mamorin-page .container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }

.mamorin-page .section { padding: 5rem 0; }
.mamorin-page .section + .section { border-top: 0.5px solid var(--border); }

.mamorin-page .label {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 1.25rem;
}

.mamorin-page .hero { padding: 6rem 0 5rem; }

.mamorin-page .hero-eyebrow {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--text-tertiary);
  margin-bottom: 2.5rem;
}

.mamorin-page .hero-title {
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 300;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

.mamorin-page .hero-sub {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2.2;
  max-width: 520px;
}

.mamorin-page .story-para {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2.3;
  margin-bottom: 1.25rem;
}

.mamorin-page .story-para:last-child { margin-bottom: 0; }

.mamorin-page .story-para strong {
  color: var(--text);
  font-weight: 500;
}

/* FAQ accordion */
.mamorin-page .faq-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 0.5px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.mamorin-page .faq-item {
  border-bottom: 0.5px solid var(--border);
}

.mamorin-page .faq-item:last-child {
  border-bottom: none;
}

.mamorin-page .faq-q {
  width: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.5rem 1.75rem;
  background: var(--bg-card);
  border: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.mamorin-page .faq-q:hover {
  background: var(--bg-muted);
}

.mamorin-page .faq-item.open .faq-q {
  background: var(--bg-muted);
}

.mamorin-page .faq-q-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 16px;
  font-weight: 400;
  color: var(--text);
  line-height: 1.7;
}

.mamorin-page .faq-icon {
  font-size: 20px;
  font-weight: 300;
  color: var(--text-tertiary);
  flex-shrink: 0;
  line-height: 1.5;
  width: 1.5rem;
  text-align: center;
}

.mamorin-page .faq-a-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;
}

.mamorin-page .faq-item.open .faq-a-wrap {
  grid-template-rows: 1fr;
}

.mamorin-page .faq-a {
  overflow: hidden;
  padding: 0 1.75rem;
}

.mamorin-page .faq-item.open .faq-a {
  padding: 1.5rem 1.75rem 2rem;
}

/* CTA */
.mamorin-page .cta-section { text-align: center; padding: 6rem 1.5rem; }

.mamorin-page .cta-title {
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 400;
  margin-bottom: 1.5rem;
  line-height: 1.9;
}

.mamorin-page .cta-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 2.5rem; line-height: 2.2; }

.mamorin-page .cta-btn {
  display: inline-block;
  padding: 15px 44px;
  border: 0.5px solid var(--border-strong);
  border-radius: 40px;
  font-size: 14px;
  cursor: pointer;
  background: transparent;
  color: var(--text);
  font-family: 'Noto Sans JP', sans-serif;
  text-decoration: none;
  transition: background 0.2s;
}

.mamorin-page .cta-btn:hover { background: var(--bg-muted); }

.mamorin-page footer {
  border-top: 0.5px solid var(--border);
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.mamorin-page footer p { font-size: 12px; color: var(--text-tertiary); }
</style>
