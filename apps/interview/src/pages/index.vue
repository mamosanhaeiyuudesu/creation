<template>
  <div class="iv-page">
    <!-- ヘッダー -->
    <header class="iv-header">
      <div class="iv-wrap iv-header-inner">
        <a href="#top" class="iv-logo">
          <span class="iv-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="30" height="30">
              <path d="M16 8 C 12 5, 6 5, 3 6 V 26 C 6 25, 12 25, 16 28 Z" fill="var(--iv-navy)" />
              <path d="M16 8 C 20 5, 26 5, 29 6 V 26 C 26 25, 20 25, 16 28 Z" fill="var(--iv-accent)" />
            </svg>
          </span>
          <span class="iv-logo-text">
            <span class="iv-logo-name">ライフインタビュー</span>
            <span class="iv-logo-sub">LIFE INTERVIEW</span>
          </span>
        </a>
        <nav class="iv-nav" :class="{ 'is-open': isMenuOpen }">
          <a href="#flow" @click="isMenuOpen = false">ご利用の流れ</a>
          <a href="#price" @click="isMenuOpen = false">料金</a>
          <a href="#maker" @click="isMenuOpen = false">聞き手</a>
          <a href="#contact" class="iv-btn iv-btn-accent iv-nav-cta" @click="isMenuOpen = false">{{ site.ctaLabel }}</a>
        </nav>
        <button class="iv-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー -->
    <section id="top" class="iv-hero">
      <div class="iv-wrap iv-hero-inner">
        <p class="iv-hero-tag">LIFE INTERVIEW</p>
        <h1 class="iv-hero-catch">
          <span class="iv-nb">言えなかった思いを、</span><br />
          <span class="iv-nb iv-hero-em">一冊の本に。</span>
        </h1>
        <p class="iv-hero-sub">
          人生を振り返り、話したいテーマを気の向くままに語っていただきます。<br />
          聞き手はひたすら聴くのみです。<br />
          良し悪しを判断せず、ありのままに記録していきます。
        </p>
        <a href="#contact" class="iv-btn iv-btn-accent iv-btn-lg">
          {{ site.ctaLabel }}
          <span class="iv-btn-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <!-- ご利用の流れ -->
    <section id="flow" class="iv-section">
      <div class="iv-wrap">
        <p class="iv-label">FLOW</p>
        <h2 class="iv-title">ご利用の流れ</h2>
        <ol class="iv-flow">
          <li v-for="(s, i) in steps" :key="s.title" class="iv-flow-item">
            <span class="iv-flow-num iv-num">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 料金 -->
    <section id="price" class="iv-section iv-section-tint">
      <div class="iv-wrap iv-wrap-narrow">
        <p class="iv-label">PRICE</p>
        <h2 class="iv-title">料金</h2>
        <div class="iv-price-cards">
          <div class="iv-price-card">
            <p class="iv-price-name">インタビューと記録</p>
            <p class="iv-price-note">5〜10回のインタビュー＋編集した記録の納品</p>
            <p class="iv-price-big"><span class="iv-num">{{ site.prices.base }}</span>円</p>
          </div>
          <div class="iv-price-card iv-price-card-sub">
            <p class="iv-price-name">本にする場合</p>
            <p class="iv-price-note">製本（追加料金）</p>
            <p class="iv-price-big"><span class="iv-num">+{{ site.prices.book }}</span>円</p>
          </div>
        </div>
        <dl class="iv-details">
          <div v-for="d in details" :key="d.label" class="iv-detail">
            <dt>{{ d.label }}</dt>
            <dd>{{ d.value || 'お問い合わせ時にご案内します' }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 聞き手について -->
    <section id="maker" class="iv-section">
      <div class="iv-wrap iv-wrap-narrow">
        <p class="iv-label">INTERVIEWER</p>
        <h2 class="iv-title">聞き手について</h2>
        <div class="iv-maker">
          <p class="iv-maker-name">{{ site.makerName }}</p>
          <p class="iv-maker-tag">{{ site.makerTagline }}</p>
          <p v-if="site.profile" class="iv-maker-body">{{ site.profile }}</p>
        </div>
        <h3 class="iv-sub">なぜ、この仕事をするのか</h3>
        <div class="iv-story">
          <p>私はずっと、本音を言えない場所で生きてきました。<br />
            家でも、学校でも、会社でも、本当に感じていることを口にすると、否定されるか、なかったことにされる。<br />
            だから気持ちを飲み込み、他人の物差しに合わせて、敷かれたレールの上を歩いてきました。<br />
            外から見れば順調な人生でも、内側には、言葉にならない劣等感や怒り、満たされなさが、ずっと残っていました。</p>
          <p>それが少しずつほどけたのは、話を聞いてもらえたときです。<br />
            言えなかった思いを言葉にし、誰かに受け止めてもらい、形に残す。<br />
            そうして初めて、自分の感じてきたことは間違っていなかったと思えるようになりました。</p>
          <p>人生の本当の物語は、成功や功績の中だけにあるのではありません。<br />
            むしろ、誰にも言えなかった後悔や嫉妬、恨みや弱さの中にこそ、その人らしさがあると思っています。</p>
          <p class="iv-story-end">
            <span class="iv-marker">大した功績はいりません。</span><br />
            消されてきた気持ちを、じっくり聞いて、言葉にして、二度と消えない一冊にする。<br />
            あなたが感じてきたことは、確かにあった。<br />
            そう言える場所をつくるために、この仕事をしています。
          </p>
        </div>
      </div>
    </section>

    <!-- お問い合わせ -->
    <section id="contact" class="iv-contact">
      <div class="iv-wrap iv-wrap-narrow iv-contact-inner">
        <p class="iv-label iv-label-light">CONTACT</p>
        <h2 class="iv-contact-title">まずは、話したいことを教えてください</h2>
        <p class="iv-contact-lead">
          最初の30分で、どんなことを話したいかを一緒に整理します。<br />
          まだ形になっていなくても大丈夫です。
        </p>
        <a v-if="site.contactUrl" :href="site.contactUrl" target="_blank" rel="noopener" class="iv-btn iv-btn-accent iv-btn-lg">
          {{ site.ctaLabel }}
          <span class="iv-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p v-else class="iv-contact-pending">お問い合わせ先は、決まり次第こちらにご案内します。</p>
      </div>
    </section>

    <footer class="iv-footer">
      <div class="iv-wrap iv-footer-inner">
        <span>© ライフインタビュー ／ {{ site.domain }}</span>
        <span>聞き手：{{ site.makerName }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'interview' })

const title = 'ライフインタビュー｜言えなかった思いを、一冊の本に'
const description = '人生を振り返り、話したいテーマを気の向くままに語る。聞き手はひたすら聴き、善悪を判断せず、ありのままに記録して一冊の本にします。'
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

const steps = [
  { title: '最初の30分', body: 'どんなことを話したいかを一緒に整理します。' },
  { title: 'インタビュー5〜10回', body: '話していただき、要所で追いかけて聞きます。' },
  { title: '文字起こしと編集', body: 'インタビュー形式にまとめます。' },
  { title: '納品・製本', body: '記録をお渡しします。ご希望の方は製本します。' },
]

const details = [
  { label: '実施方法', value: site.details.method },
  { label: '1回の時間', value: site.details.minutes },
  { label: '期間の目安', value: site.details.period },
  { label: '支払い方法', value: site.details.payment },
]
</script>
