<template>
  <div class="ac-page">
    <!-- ヘッダー -->
    <header class="ac-header">
      <div class="ac-wrap ac-header-inner">
        <a href="#top" class="ac-logo">
          <span class="ac-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30">
              <path d="M16 8 C 12 5, 6 5, 3 6 V 26 C 6 25, 12 25, 16 28 Z" fill="var(--ac-navy)" />
              <path d="M16 8 C 20 5, 26 5, 29 6 V 26 C 26 25, 20 25, 16 28 Z" fill="var(--ac-accent)" />
            </svg>
          </span>
          <span class="ac-logo-text">
            <span class="ac-logo-name">{{ site.serviceName }}</span>
            <span class="ac-logo-sub">AI CONSULTING 1on1</span>
          </span>
        </a>
        <nav class="ac-nav" :class="{ 'is-open': isMenuOpen }">
          <a href="#for" @click="isMenuOpen = false">こんな方に</a>
          <a href="#topics" @click="isMenuOpen = false">学べること</a>
          <a href="#flow" @click="isMenuOpen = false">流れ</a>
          <a href="#price" @click="isMenuOpen = false">料金</a>
          <a href="#contact" class="ac-btn ac-btn-accent ac-nav-cta" @click="isMenuOpen = false">{{ site.ctaLabel }}</a>
        </nav>
        <button class="ac-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー -->
    <section id="top" class="ac-hero">
      <div class="ac-wrap ac-hero-inner">
        <p class="ac-hero-tag">AI CONSULTING 1on1</p>
        <h1 class="ac-hero-catch">
          <span class="ac-nb">AIっぽくない、</span><br />
          <span class="ac-nb ac-hero-em">あなたの作品を。</span>
        </h1>
        <p class="ac-hero-sub">
          まず、あなたの話をじっくり聞きます。<br />
          そのうえで、あなたの仕事に合ったAIの使い方を、1on1でお伝えします。<br />
          1回{{ site.minutes }}分・全{{ site.sessions }}回のマンツーマン・レクチャーです。まずは1回のお試しもできます。
        </p>
        <a href="#contact" class="ac-btn ac-btn-accent ac-btn-lg">
          {{ site.ctaLabel }}
          <span class="ac-btn-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <!-- こんな方に -->
    <section id="for" class="ac-section">
      <div class="ac-wrap">
        <p class="ac-label">FOR YOU</p>
        <h2 class="ac-title">こんな方に</h2>
        <p class="ac-lead">個人でAIを使い、ご自分の仕事を良くしたい方のためのコースです。</p>
        <ul class="ac-for-grid">
          <li v-for="f in forList" :key="f" class="ac-for">{{ f }}</li>
        </ul>
      </div>
    </section>

    <!-- 学べること -->
    <section id="topics" class="ac-section ac-section-tint">
      <div class="ac-wrap">
        <p class="ac-label">TOPICS</p>
        <h2 class="ac-title">学べること</h2>
        <p class="ac-lead">内容は決まった型ではなく、事前にいただくご要望に合わせて組み立てます。</p>
        <div class="ac-about-list">
          <div v-for="(t, i) in topics" :key="t.title" class="ac-about">
            <span class="ac-about-num ac-num">{{ i + 1 }}</span>
            <h4>{{ t.title }}</h4>
            <p>{{ t.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 流れ -->
    <section id="flow" class="ac-section">
      <div class="ac-wrap">
        <p class="ac-label">FLOW</p>
        <h2 class="ac-title">ご利用の流れ</h2>
        <ol class="ac-flow">
          <li v-for="(s, i) in steps" :key="s.title" class="ac-flow-item">
            <span class="ac-flow-num ac-num">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 料金 -->
    <section id="price" class="ac-section ac-section-tint">
      <div class="ac-wrap ac-wrap-narrow">
        <p class="ac-label">PRICE</p>
        <h2 class="ac-title">料金</h2>
        <div class="ac-price-cards">
          <div class="ac-price-card">
            <p class="ac-price-name">{{ site.sessions }}回コース（1on1）</p>
            <p class="ac-price-note">事前のご要望の整理＋1回{{ site.minutes }}分のレクチャー×{{ site.sessions }}回</p>
            <p class="ac-price-big"><span class="ac-num">{{ site.price }}</span>円</p>
          </div>
          <div class="ac-price-card ac-price-trial">
            <p class="ac-price-tag">単発のお試し</p>
            <p class="ac-price-name">お試しセッション（1回{{ site.minutes }}分）</p>
            <p class="ac-price-note">まずは1回だけ受けてみたい方に。ご要望に沿って1on1でお伝えします。</p>
            <p class="ac-price-big"><span class="ac-num">{{ site.trialPrice }}</span>円</p>
          </div>
        </div>
        <dl class="ac-details">
          <div v-for="d in details" :key="d.label" class="ac-detail">
            <dt>{{ d.label }}</dt>
            <dd>{{ d.value || 'お問い合わせ時にご案内します' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 聞き手について -->
    <section id="maker" class="ac-section">
      <div class="ac-wrap ac-wrap-narrow">
        <p class="ac-label">ADVISOR</p>
        <h2 class="ac-title">担当者について</h2>
        <div class="ac-maker">
          <p class="ac-maker-name">{{ site.makerName }}</p>
          <p class="ac-maker-tag">{{ site.makerTagline }}</p>
          <p v-if="site.profile" class="ac-maker-body">{{ site.profile }}</p>
        </div>
        <div class="ac-story">
          <p>AIの使い方は、人によって正解が違います。<br />
            同じツールでも、どんな仕事で、何に困っていて、何を大事にしているかで、使いどころはまったく変わるからです。</p>
          <p class="ac-story-end">
            <span class="ac-marker">だから、教える前にまず聞きます。</span><br />
            あなたの仕事と、これまでのやり方と、こうなりたいという姿を聞いて、<br />
            それに合わせたAIの使い方を、一緒に作っていきます。
          </p>
        </div>
      </div>
    </section>

    <!-- お問い合わせ -->
    <section id="contact" class="ac-contact">
      <div class="ac-wrap ac-wrap-narrow ac-contact-inner">
        <p class="ac-label ac-label-light">CONTACT</p>
        <h2 class="ac-contact-title">まずは、ご要望を教えてください</h2>
        <p class="ac-contact-lead">
          お問い合わせで、お仕事の内容と「AIでこうしたい」を送っていただきます。<br />
          うまく言葉にできなくても大丈夫です。
        </p>
        <a v-if="site.contactUrl" :href="site.contactUrl" target="_blank" rel="noopener" class="ac-btn ac-btn-accent ac-btn-lg">
          {{ site.ctaLabel }}
          <span class="ac-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p v-else class="ac-contact-pending">お問い合わせ先は、決まり次第こちらにご案内します。</p>
      </div>
    </section>

    <footer class="ac-footer">
      <div class="ac-wrap ac-footer-inner">
        <span>© {{ site.serviceName }} ／ {{ site.domain }}</span>
        <span>担当：{{ site.makerName }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'ai-consultant' })

const title = 'AI活用相談｜話を聞いて、あなたに合ったAIの使い方を1on1で'
const description = '個人でAIを使って仕事を改善・効率化したい方へ。ご要望をじっくり聞いたうえで、画像・動画づくりのコツやプロンプトの書き方など、AIっぽくないオリジナルなコンテンツの作り方を1on1でお伝えします。1回60分・全10回。'
useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `https://${site.domain}/` },
    { name: 'twitter:card', content: 'summary' },
  ],
})

const isMenuOpen = ref(false)

const forList = [
  'AIは使っているが、いかにも「AIっぽい」出来にとどまっている',
  '画像や動画を、自分らしいオリジナルな表現でつくりたい',
  'プロンプトの書き方が、いつも手探りになっている',
  '自分の仕事のどこにAIを使えばいいか、整理できていない',
  '本やネットの情報ではなく、自分の状況に合った助言がほしい',
  '個人で、ビジネスの改善や効率化にAIを取り入れたい',
]

const topics = [
  { title: '文章づくりのコツ', body: 'AIが書いたとすぐ分かる文章から抜け出し、あなたの言葉で読まれる文章に仕上げるための頼み方・直し方をお伝えします。' },
  { title: '画像づくりのコツ', body: '「AIが作った感」が出る原因と、そこから抜けて、自分の世界観のある画像に仕上げる考え方をお伝えします。' },
  { title: '動画づくりのコツ', body: '素材の作り方から見せ方まで、オリジナル性のある動画コンテンツにするためのポイントをお伝えします。' },
  { title: 'プロンプトのコツ', body: '指示の出し方、意図の伝え方、直し方。思いどおりの結果に近づけるための書き方を一緒に練習します。' },
  { title: '仕事への組み込み方', body: 'ご自身のビジネスのどこにAIを使えば効くのかを整理し、日々の作業の効率化につなげます。' },
]

const steps = [
  { title: 'お問い合わせ・ご要望の提出', body: 'お仕事の内容と、AIでやりたいこと・困っていることを事前にお送りいただきます。' },
  { title: '当日：1on1のレクチャー', body: 'いただいたご要望に沿って、画面を見ながらマンツーマンでお伝えします。' },
  { title: '全10回を重ねる', body: '回ごとに試した結果を持ち寄り、次の回の内容を調整していきます。' },
  { title: '自分で使いこなせる状態へ', body: '終わるころには、ご自身でAIを使い続けられる状態を目指します。' },
]

const details = [
  { label: '実施方法', value: site.details.method },
  { label: '1回の時間', value: site.details.minutes },
  { label: '期間の目安', value: site.details.period },
  { label: '支払い方法', value: site.details.payment },
]
</script>
