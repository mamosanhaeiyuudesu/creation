<template>
  <div class="pp-page">

    <!-- 上部の細い帯 -->
    <div class="pp-topbar">
      <div class="pp-wrap pp-topbar-inner">
        <span>インタビューでつくる、あなたの自伝本</span>
        <span>聞き手：<a :href="site.noteUrl" target="_blank" rel="noopener">{{ site.makerName }}</a></span>
      </div>
    </div>

    <!-- ヘッダー -->
    <header class="pp-header">
      <div class="pp-wrap pp-header-inner">
        <a href="#top" class="pp-logo">
          <span class="pp-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <path d="M16 8 C 12 5, 6 5, 3 6 V 26 C 6 25, 12 25, 16 28 Z" fill="var(--pp-main)" />
              <path d="M16 8 C 20 5, 26 5, 29 6 V 26 C 26 25, 20 25, 16 28 Z" fill="var(--pp-accent)" />
            </svg>
          </span>
          <span class="pp-logo-text">
            <span class="pp-logo-name">人生のインタビュー</span>
            <span class="pp-logo-sub">LIFE INTERVIEW</span>
          </span>
        </a>
        <nav class="pp-nav" :class="{ 'is-open': isMenuOpen }">
          <a href="#about" @click="isMenuOpen = false">特徴</a>
          <a href="#book" @click="isMenuOpen = false">本の中身</a>
          <a href="#voice" @click="isMenuOpen = false">体験者の声</a>
          <a href="#price" @click="isMenuOpen = false">料金</a>
          <a href="#faq" @click="isMenuOpen = false">よくある質問</a>
          <a :href="site.noteUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-nav-cta">noteのDMで相談する</a>
        </nav>
        <button class="pp-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー -->
    <section id="top" class="pp-hero">
      <div class="pp-wrap pp-hero-inner">
        <div class="pp-hero-text">
          <p class="pp-hero-tag">あなたの人生を、1冊の本に</p>
          <h1 class="pp-hero-catch">
            <span class="pp-nb">人は誰もが、</span><br />
            <span class="pp-nb">語る価値のある人生を</span><br />
            <span class="pp-nb pp-hero-catch-em">生きている。</span>
          </h1>
          <ul class="pp-hero-chips">
            <li>全6〜7回のインタビュー</li>
            <li>写真・年表・家系図入り</li>
            <li>製本してお届け</li>
          </ul>
          <p class="pp-hero-sub">
            聞き手との対話を重ねて、あなたが話した言葉のまま、<br class="pp-pc" />1冊の本にします。<br class="pp-pc" />
            自分の振り返りに。家族への贈り物に。
          </p>
          <a :href="site.noteUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
            noteのDMで相談する
            <span class="pp-btn-arrow" aria-hidden="true">→</span>
          </a>
        </div>

        <!-- 本の見本（架空の内容） -->
        <div class="pp-hero-visual">
          <svg viewBox="0 0 520 400" class="pp-svg" role="img" aria-label="開いた本（目次と年表）と、表紙の見本">
            <ellipse cx="260" cy="372" rx="240" ry="14" fill="rgba(46, 74, 50, 0.12)" />
            <!-- 開いた本 -->
            <path d="M20 70 Q 115 52, 210 70 V 352 Q 115 336, 20 352 Z" fill="#fffef8" stroke="var(--pp-line)" />
            <path d="M210 70 Q 305 52, 400 70 V 352 Q 305 336, 210 352 Z" fill="#fffef8" stroke="var(--pp-line)" />
            <line x1="210" y1="70" x2="210" y2="352" stroke="var(--pp-line)" stroke-width="2" />
            <text x="42" y="106" class="pp-svg-head">目次</text>
            <g v-for="(c, i) in heroChapters" :key="c">
              <text x="42" :y="138 + i * 38" class="pp-svg-chapter">第{{ kanjiNum[i] }}章</text>
              <text x="42" :y="156 + i * 38" class="pp-svg-text">{{ c }}</text>
            </g>
            <text x="232" y="106" class="pp-svg-head">年表</text>
            <line x1="244" y1="124" x2="244" y2="318" stroke="var(--pp-main)" stroke-width="2" />
            <g v-for="(t, i) in heroTimeline" :key="t.year">
              <circle cx="244" :cy="132 + i * 44" r="5" :fill="i === heroTimeline.length - 1 ? 'var(--pp-accent)' : 'var(--pp-main)'" />
              <text x="256" :y="136 + i * 44" class="pp-svg-year">{{ t.year }}</text>
              <text x="294" :y="136 + i * 44" class="pp-svg-text">{{ t.label }}</text>
            </g>
          </svg>
          <!-- 表紙 -->
          <div class="pp-cover" aria-hidden="true">
            <span class="pp-cover-spine" />
            <span class="pp-cover-sub">五つの問いから</span>
            <span class="pp-cover-title">歩いて<br />きた道</span>
            <span class="pp-cover-foot">LIFE INTERVIEW</span>
          </div>
          <div class="pp-badge">
            <span class="pp-badge-small">1回90分〜2時間</span>
            <span class="pp-badge-mid">インタビュー</span>
            <span class="pp-badge-num">6〜7<small>回</small></span>
          </div>
        </div>
      </div>
    </section>

    <!-- ヒーローの下に重なる料金カード -->
    <div class="pp-wrap pp-hero-cards">
      <div v-for="(p, i) in site.plans" :key="p.name" class="pp-hero-card">
        <div class="pp-hero-card-icon">
          <svg v-if="i === 0" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z" />
          </svg>
          <span>{{ i === 0 ? 'じっくり' : 'たっぷり' }}</span>
        </div>
        <div class="pp-hero-card-body">
          <p class="pp-hero-card-lead">{{ p.name }}</p>
          <p class="pp-hero-card-big"><span class="pp-num">{{ p.price }}</span>円</p>
          <p class="pp-hero-card-note">税込・写真・年表・家系図入り</p>
        </div>
      </div>
    </div>

    <!-- こんな方へ -->
    <section id="for" class="pp-section">
      <div class="pp-wrap">
        <p class="pp-label">FOR YOU</p>
        <h2 class="pp-title">こんな方に、<br class="pp-sp" />おすすめです</h2>
        <div class="pp-for-grid">
          <div v-for="f in forYou" :key="f.title" class="pp-for">
            <span class="pp-for-who">{{ f.who }}</span>
            <h3 class="pp-for-title">{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 特徴 -->
    <section id="about" class="pp-section pp-section-tint">
      <div class="pp-wrap">
        <p class="pp-label">ABOUT</p>
        <h2 class="pp-title">話した言葉が、そのまま本になる</h2>
        <p class="pp-lead">話したいことを、とことん聴きます。<br class="pp-pc" />その言葉を、家族や次の世代へ渡せる形にします。</p>
        <ol class="pp-about-list">
          <li v-for="(a, i) in abouts" :key="a.title" class="pp-about">
            <span class="pp-about-num pp-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ a.title }}</h3>
            <p>{{ a.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 本の中身 -->
    <section id="book" class="pp-section">
      <div class="pp-wrap">
        <p class="pp-label">BOOK</p>
        <h2 class="pp-title">本の中身</h2>
        <p class="pp-lead">本文のほかに、年表・家系図・思い出の写真が入ります。<br class="pp-pc" /><span class="pp-note-inline">※架空の内容で作った見本です</span></p>

        <div class="pp-book-grid">
          <!-- 目次 -->
          <figure class="pp-book">
            <svg viewBox="0 0 300 200" class="pp-svg" role="img" aria-label="問いの形をした章タイトルが並ぶ目次">
              <rect x="0" y="0" width="300" height="200" rx="6" fill="#fffef8" stroke="var(--pp-line)" />
              <text x="20" y="32" class="pp-svg-head">目次</text>
              <g v-for="(c, i) in bookChapters" :key="c">
                <text x="20" :y="60 + i * 26" class="pp-svg-chapter">{{ kanjiNum[i] }}</text>
                <text x="42" :y="60 + i * 26" class="pp-svg-text">{{ c }}</text>
                <line x1="20" :y1="68 + i * 26" x2="280" :y2="68 + i * 26" stroke="var(--pp-line)" stroke-dasharray="2 3" />
              </g>
            </svg>
            <figcaption>
              <h3>問いが、章になる目次</h3>
              <p>年代順ではなく、人生の分かれ道を聞き手の「問い」で章にします。</p>
            </figcaption>
          </figure>

          <!-- 年表 -->
          <figure class="pp-book">
            <svg viewBox="0 0 300 200" class="pp-svg" role="img" aria-label="誕生から現在までの出来事を並べた年表">
              <rect x="0" y="0" width="300" height="200" rx="6" fill="#fffef8" stroke="var(--pp-line)" />
              <text x="20" y="32" class="pp-svg-head">年表</text>
              <line x1="24" y1="110" x2="268" y2="110" stroke="var(--pp-main)" stroke-width="2" />
              <g v-for="(t, i) in bookTimeline" :key="t.year">
                <circle :cx="34 + i * 56" cy="110" r="6" :fill="i === bookTimeline.length - 1 ? 'var(--pp-accent)' : 'var(--pp-main)'" />
                <text :x="34 + i * 56" :y="i % 2 === 0 ? 88 : 140" class="pp-svg-year" text-anchor="middle">{{ t.year }}</text>
                <text :x="34 + i * 56" :y="i % 2 === 0 ? 72 : 156" class="pp-svg-text" text-anchor="middle">{{ t.label }}</text>
              </g>
            </svg>
            <figcaption>
              <h3>冒頭に、年表</h3>
              <p>本文を読む前に、人生の大きな流れがつかめます。</p>
            </figcaption>
          </figure>

          <!-- 家系図 -->
          <figure class="pp-book">
            <svg viewBox="0 0 300 200" class="pp-svg" role="img" aria-label="登場する人の名前だけを載せた簡単な家系図">
              <rect x="0" y="0" width="300" height="200" rx="6" fill="#fffef8" stroke="var(--pp-line)" />
              <text x="20" y="32" class="pp-svg-head">家系図</text>
              <path d="M110 66 H 190 M150 66 V 96 M90 96 H 210 M90 96 V 112 M210 96 V 112 M210 136 V 160" fill="none" stroke="var(--pp-main)" stroke-width="1.5" />
              <g v-for="p in familyTree" :key="p.label">
                <rect :x="p.x - 32" :y="p.y - 14" width="64" height="26" rx="4" :fill="p.self ? 'var(--pp-accent)' : '#fff'" :stroke="p.self ? 'var(--pp-accent)' : 'var(--pp-main)'" />
                <text :x="p.x" :y="p.y + 4" class="pp-svg-text" text-anchor="middle">{{ p.label }}</text>
              </g>
            </svg>
            <figcaption>
              <h3>名前だけの、簡単な家系図</h3>
              <p>登場する方の関係が分かるように。名前だけを載せます。</p>
            </figcaption>
          </figure>

          <!-- 写真 -->
          <figure class="pp-book">
            <svg viewBox="0 0 300 200" class="pp-svg" role="img" aria-label="思い出の写真を並べたページ">
              <rect x="0" y="0" width="300" height="200" rx="6" fill="#fffef8" stroke="var(--pp-line)" />
              <g v-for="(ph, i) in photos" :key="i" :transform="`rotate(${ph.r} ${ph.x + 50} ${ph.y + 40})`">
                <rect :x="ph.x" :y="ph.y" width="100" height="84" fill="#fff" stroke="var(--pp-line)" />
                <rect :x="ph.x + 6" :y="ph.y + 6" width="88" height="60" :fill="ph.c" />
                <circle :cx="ph.x + 30" :cy="ph.y + 28" r="8" fill="rgba(255,255,255,0.7)" />
                <path :d="`M${ph.x + 6} ${ph.y + 66} L ${ph.x + 40} ${ph.y + 40} L ${ph.x + 62} ${ph.y + 56} L ${ph.x + 94} ${ph.y + 34} V ${ph.y + 66} Z`" fill="rgba(255,255,255,0.45)" />
              </g>
            </svg>
            <figcaption>
              <h3>思い出の写真</h3>
              <p>お預かりした写真は、明るさや画素数を整えてから印刷します。</p>
            </figcaption>
          </figure>
        </div>

        <ul class="pp-spec">
          <li>約<span class="pp-num">150〜200</span>ページ</li>
          <li>製本<span class="pp-num">3</span>冊</li>
          <li>文字起こしもお渡し</li>
        </ul>
        <p class="pp-spec-note">※12時間インタビューの場合</p>
      </div>
    </section>

    <!-- 体験者の声 -->
    <section id="voice" class="pp-section pp-section-tint">
      <div class="pp-wrap">
        <p class="pp-label">VOICE</p>
        <h2 class="pp-title">体験者の声</h2>
        <div class="pp-voice">
          <div class="pp-voice-head">
            <span class="pp-voice-icon" aria-hidden="true">“</span>
            <div>
              <p class="pp-voice-label">本をつくった方の声</p>
              <p class="pp-voice-person">40代・男性 ／ Uさん</p>
            </div>
          </div>
          <div class="pp-voice-grid">
            <div v-for="v in voices" :key="v.title" class="pp-voice-point">
              <h3>{{ v.title }}</h3>
              <p>{{ v.body }}</p>
            </div>
          </div>
          <p class="pp-voice-close">「受け取った本は、<span class="pp-marker">宝物です。</span>」</p>
        </div>

        <!-- 補足：カウンセリング的な効果（メインでは訴求しない） -->
        <aside class="pp-aside">
          <p class="pp-aside-label">話すこと・読み返すこと</p>
          <p>人生を話し、文字で読み返すことには、カウンセリングに近い働きもあります。</p>
          <ul>
            <li>何度も読むうちに、自分を受け入れる感覚が少しずつ育つ</li>
            <li>親の人生を親の視点で読むと、見方が変わることがある</li>
          </ul>
          <p class="pp-aside-note">※感じ方には個人差があります</p>
        </aside>
      </div>
    </section>

    <!-- 聞き手 -->
    <section id="maker" class="pp-section">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">INTERVIEWER</p>
        <h2 class="pp-title">聞き手</h2>
        <div class="pp-maker">
          <div class="pp-maker-name">
            <span class="pp-maker-avatar" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
            </span>
            <p>{{ site.makerName }}</p>
          </div>
          <div class="pp-maker-body">
            <p>人の人生には、誰にでも意味があると信じています。ご本人もまだ気づいていない宝物に耳を傾け、家族や次の世代へ渡せる形にすることを大切にしています。</p>
            <p>インタビューでは、質問や意見をはさみすぎず、あなたが話したいように話していただくことを心がけています。</p>
            <a :href="site.noteUrl" target="_blank" rel="noopener" class="pp-text-link">noteを読む →</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 料金 -->
    <section id="price" class="pp-section pp-section-tint">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">PRICE</p>
        <h2 class="pp-title">プランと料金</h2>
        <div class="pp-price-grid">
          <div v-for="(p, i) in site.plans" :key="p.name" class="pp-price" :class="{ 'is-main': i === 1 }">
            <p class="pp-price-name">{{ p.name }}</p>
            <p class="pp-price-amount"><span class="pp-num">{{ p.price }}</span>円<small>（税込）</small></p>
            <ul>
              <li v-for="item in p.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
        <p class="pp-price-note">内容の詳細は、ご相談のうえでご案内します。</p>
      </div>
    </section>

    <!-- 流れ -->
    <section id="flow" class="pp-section">
      <div class="pp-wrap">
        <p class="pp-label">FLOW</p>
        <h2 class="pp-title">ご依頼の流れ</h2>
        <ol class="pp-flow">
          <li v-for="(f, i) in flowSteps" :key="f.title">
            <span class="pp-flow-num">STEP <span class="pp-num">{{ i + 1 }}</span></span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="pp-section pp-section-tint">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">FAQ</p>
        <h2 class="pp-title">よくある質問</h2>
        <dl class="pp-faq">
          <div v-for="q in faqs" :key="q.q" class="pp-faq-item">
            <dt>{{ q.q }}</dt>
            <dd>{{ q.a }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 最後の CTA -->
    <section id="contact" class="pp-cta">
      <div class="pp-wrap pp-cta-inner">
        <p class="pp-cta-sub">まずは、あなたの話を聞かせてください</p>
        <h2 class="pp-cta-title">ご相談は、<br class="pp-sp" />noteのDMから</h2>
        <p class="pp-cta-note">どんな本にしたいか、まだ決まっていなくても大丈夫です。</p>
        <a :href="site.noteUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
          noteのDMで相談する
          <span class="pp-btn-arrow" aria-hidden="true">→</span>
        </a>
      </div>
    </section>

    <footer class="pp-footer">
      <div class="pp-wrap pp-footer-inner">
        <span>© 人生のインタビュー ／ {{ site.domain }}</span>
        <a :href="site.noteUrl" target="_blank" rel="noopener">聞き手：{{ site.makerName }}（note）</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'shimano-papa' })

const isMenuOpen = ref(false)

const kanjiNum = ['一', '二', '三', '四', '五', '六']

/* ---- 本の見本（架空の内容） ---- */

const heroChapters = [
  'なぜ、あの道を選んだのか',
  'いちばん苦しかったとき',
  'ずっと大切にしてきたもの',
  '家族に、伝えたいこと',
  'これから、どう生きたいか',
]

const heroTimeline = [
  { year: '1982', label: '誕生' },
  { year: '2001', label: '上京' },
  { year: '2009', label: '結婚' },
  { year: '2016', label: '独立' },
  { year: '2026', label: '本をつくる' },
]

const bookChapters = heroChapters

const bookTimeline = heroTimeline

const familyTree = [
  { label: '一郎', x: 110, y: 64 },
  { label: '春子', x: 190, y: 64 },
  { label: '健', x: 90, y: 124 },
  { label: 'あなた', x: 210, y: 124, self: true },
  { label: '由美', x: 210, y: 172 },
]

const photos = [
  { x: 24, y: 30, r: -4, c: '#b9d68c' },
  { x: 100, y: 88, r: 3, c: '#e9d27a' },
  { x: 176, y: 28, r: -2, c: '#9fb8a3' },
]

/* ---- 各セクションの文言 ---- */

const forYou = [
  { who: '自分のために', title: '人生を振り返りたい', body: 'これまでを言葉にして、これからの生き方を考えたい方に。' },
  { who: '家族のために', title: '親や祖父母の人生を残したい', body: 'お子さんやお孫さんから贈る本に。聞いておきたかった話が残ります。' },
  { who: '事業のために', title: '理念を伝えたい', body: '事業を始める前に、想いと歩みを本にして伝えたい方に。' },
]

const abouts = [
  { title: '問いが、章になる', body: '年代順の自分史ではなく、人生の分かれ道を、聞き手の「問い」で章にします。' },
  { title: 'あなたの言葉のまま', body: '話した言葉がそのまま残るので、嘘がなく、熱量が伝わります。' },
  { title: '形に残る', body: 'その場で終わらず、本と文字起こしが手元に残ります。何度でも読み返せます。' },
]

const voices = [
  { title: '話しやすかった', body: '話がそれず、自分の話したいように話せた。空気で話しにくくなることがなかった。' },
  { title: '本の仕上がり', body: '質問が章になる構成が面白い。タイトルも、自分の思いをうまく捉えていた。' },
  { title: '自分の言葉が残る', body: '嘘がなく、熱量が伝わる。何度も読み返すうちに、大事にしていることが見えてきた。' },
  { title: '身近な人にも', body: '自分も義父の話を聞いてみたくなった。身近な人の見え方が変わった。' },
]

const flowSteps = [
  { title: '聴く', body: 'インタビューを6〜7回（1回90分〜2時間）。Zoomなどの段取りはこちらで用意します。' },
  { title: '編む', body: '全文を読み込み、大切なテーマを選んで、問いごとに章を組みます。タイトルも、お話を聞く中で一緒に決めます。' },
  { title: '遺す', body: '年表・家系図・写真を入れて製本し、お届けします。文字起こしも一緒にお渡しします。' },
]

const faqs = [
  { q: '初対面でも話せますか？', a: 'まずは話しやすいところから、少しずつ伺います。質問や意見をはさみすぎず、あなたの話したいように話していただけます。' },
  { q: 'オンラインでできますか？', a: 'はい。Zoomなどでお話を伺います。段取りはこちらで用意します。' },
  { q: '親へのプレゼントとして頼めますか？', a: 'はい。お子さんやお孫さんからのご依頼もお受けしています。' },
  { q: '家族のことは、どこまで本に載りますか？', a: '家系図は、登場する方の名前だけの簡単なものにします。載せる内容は、ご相談しながら決めます。' },
  { q: '家族以外の人が読んでも分かりますか？', a: '背景が分かりにくいところには、注釈を入れます。' },
  { q: '古い写真でも載せられますか？', a: 'はい。明るさや画素数を整えてから印刷します。' },
  { q: 'タイトルは誰が決めますか？', a: 'お話を聞く中で、一緒に決めます。' },
]

const description =
  '聞き手との対話を重ねて、あなたが話した言葉のまま1冊の本にする自伝本づくり。全6〜7回のインタビュー、写真・年表・家系図入り。5時間インタビュー98,000円、12時間インタビュー198,000円（税込）。'

useHead({
  title: '人生のインタビュー | 人は誰もが、語る価値のある人生を生きている。',
  htmlAttrs: { lang: 'ja' },
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: '人生のインタビュー | あなたの人生を、1冊の本に' },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `https://${site.domain}/` },
  ],
})
</script>

<style>
@import '~/assets/css/shimano-papa.css';
</style>
