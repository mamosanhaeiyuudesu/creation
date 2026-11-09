<template>
  <div class="pp-page">

    <!-- 上部の細い帯 -->
    <div class="pp-topbar">
      <div class="pp-wrap pp-topbar-inner">
        <span>{{ page.topbar }}</span>
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
          <a v-if="voices" href="#voice" @click="isMenuOpen = false">体験者の声</a>
          <a href="#price" @click="isMenuOpen = false">料金</a>
          <a href="#faq" @click="isMenuOpen = false">よくある質問</a>
          <a href="#maker" @click="isMenuOpen = false">聞き手</a>
          <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-nav-cta">{{ site.ctaShort }}</a>
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
          <p class="pp-hero-tag">{{ page.tag }}</p>
          <h1 class="pp-hero-catch" :class="{ 'is-long': page.catch[0].length > 12 }">
            <template v-for="(l, i) in page.catch" :key="l">
              <span class="pp-nb" :class="{ 'pp-hero-catch-em': i === page.catch.length - 1 }">{{ l }}</span><br v-if="i < page.catch.length - 1" />
            </template>
          </h1>
          <ul class="pp-hero-chips">
            <li>インタビュー4回（各90分）</li>
            <li>写真・年表・家系図入り</li>
            <li>A5判小冊子3冊</li>
          </ul>
          <p class="pp-hero-sub">
            <template v-for="(l, i) in page.sub" :key="l">{{ l }}<br v-if="i < page.sub.length - 1" class="pp-pc" /></template>
          </p>
          <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
            {{ page.cta }}
            <span class="pp-btn-arrow" aria-hidden="true">→</span>
          </a>
          <p class="pp-hero-trial">
            1回（{{ site.trial.minutes }}分）の<a href="#trial">お試しインタビュー</a>もあります
          </p>
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
            <span class="pp-cover-sub">{{ page.cover.sub }}</span>
            <span class="pp-cover-title">{{ page.cover.title[0] }}<br />{{ page.cover.title[1] }}</span>
            <span class="pp-cover-foot">LIFE INTERVIEW</span>
          </div>
          <a href="#trial" class="pp-badge">
            <span class="pp-badge-small">1回{{ site.trial.minutes }}分</span>
            <span class="pp-badge-mid">お試しインタビュー</span>
            <span class="pp-badge-num">2<small>万円</small></span>
          </a>
        </div>
      </div>
    </section>

    <!-- ヒーローの下に重なる料金カード -->
    <div class="pp-wrap pp-hero-cards">
      <a v-for="(p, i) in site.plans" :key="p.short" href="#price" class="pp-hero-card">
        <div class="pp-hero-card-icon">
          <svg v-if="i === 0" viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10a7 7 0 0 0 14 0" /><line x1="12" y1="17" x2="12" y2="22" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M2 4h7a3 3 0 0 1 3 3v14a2 2 0 0 0-2-2H2z" /><path d="M22 4h-7a3 3 0 0 0-3 3v14a2 2 0 0 1 2-2h8z" />
          </svg>
          <span>{{ p.short }}</span>
        </div>
        <div class="pp-hero-card-body">
          <p class="pp-hero-card-lead"><span v-for="(seg, j) in titleSegments(p.title)" :key="j" class="pp-nb">{{ seg }}</span></p>
          <p class="pp-hero-card-big"><span class="pp-num">{{ p.price }}</span>円</p>
          <p class="pp-hero-card-note">税込・写真・年表・家系図入り</p>
        </div>
      </a>
    </div>

    <!-- 聞き手のごあいさつ（短縮版。全文は #maker） -->
    <div class="pp-wrap pp-wrap-narrow pp-greeting">
      <img class="pp-maker-avatar pp-greeting-avatar" src="/papa.jpg" :alt="`聞き手の${site.makerName}`" width="72" height="72" />
      <div>
        <p>宮古島に暮らす、{{ site.makerName }}・{{ site.makerFullName }}です。<br />
          全国どこからでも、オンラインでお話を伺います。<br />
          人の人生には、誰にでも意味があると信じています。</p>
        <a href="#maker" class="pp-text-link">聞き手について →</a>
      </div>
    </div>

    <!-- 入口ごとの導入 -->
    <section id="story" class="pp-section">
      <div class="pp-wrap pp-wrap-narrow pp-story">
        <p class="pp-label">STORY</p>
        <h2 class="pp-title">{{ entry.story.title }}</h2>
        <blockquote v-if="entry.story.quote" class="pp-quote">
          <template v-for="(l, i) in entry.story.quote" :key="l">{{ l }}<br v-if="i < entry.story.quote.length - 1" /></template>
        </blockquote>
        <p v-for="p in entry.story.paras" :key="p" class="pp-story-p">{{ p }}</p>
      </div>
    </section>

    <section v-for="(b, bi) in entry.blocks" :id="b.id" :key="b.id" class="pp-section" :class="{ 'pp-section-tint': bi % 2 === 0 }">
      <div class="pp-wrap">
        <p class="pp-label">{{ b.label }}</p>
        <h2 class="pp-title">{{ b.title }}</h2>
        <p v-if="b.lead" class="pp-lead">{{ b.lead }}</p>
        <div class="pp-for-grid" :class="{ 'is-2': b.items.length === 2 }">
          <div v-for="f in b.items" :key="f.title" class="pp-for">
            <span v-if="f.who" class="pp-for-who">{{ f.who }}</span>
            <h3 class="pp-for-title">{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="occasion" class="pp-section">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">OCCASION</p>
        <h2 class="pp-title">{{ entry.occasion.title }}</h2>
        <ul class="pp-occ">
          <li v-for="o in entry.occasion.items" :key="o">{{ o }}</li>
        </ul>
        <p v-if="entry.occasion.note" class="pp-occ-note">{{ entry.occasion.note }}</p>
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
          <li>約<span class="pp-num">30</span>ページ／約<span class="pp-num">70</span>ページ</li>
          <li>A5判・製本<span class="pp-num">3</span>冊</li>
          <li>文字起こしデータもお渡し</li>
        </ul>
      </div>
    </section>

    <!-- 体験者の声 -->
    <section v-if="voices" id="voice" class="pp-section pp-section-tint">
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

    <!-- 料金 -->
    <section id="price" class="pp-section">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">PRICE</p>
        <h2 class="pp-title">プランと料金</h2>
        <div class="pp-price-grid">
          <div v-for="p in site.plans" :key="p.short" class="pp-price" :class="{ 'is-main': p.recommended }">
            <span v-if="p.recommended" class="pp-price-ribbon">おすすめ</span>
            <p class="pp-price-name"><span v-for="(seg, j) in titleSegments(p.title)" :key="j" class="pp-nb">{{ seg }}</span></p>
            <p class="pp-price-spec">
              文字目安{{ p.chars }}文字、写真掲載{{ p.photos }}枚以内<br />
              <small>インタビュー時間 約{{ p.hours }}時間</small>
            </p>
            <p class="pp-price-amount"><span class="pp-num">{{ p.price }}</span>円<small>（税込）</small></p>
            <ul>
              <li v-for="item in p.items" :key="item">{{ item }}</li>
              <li>完成までの目安は{{ p.period }}</li>
            </ul>
          </div>
        </div>

        <!-- お試しインタビュー -->
        <div id="trial" class="pp-trial">
          <div class="pp-trial-head">
            <p class="pp-trial-label">まずは、お試しから</p>
            <p class="pp-trial-name">お試しインタビュー<small>1回（{{ site.trial.minutes }}分）</small></p>
            <p class="pp-trial-amount"><span class="pp-num">{{ site.trial.price }}</span>円<small>（税込）</small></p>
          </div>
          <ul class="pp-trial-list">
            <li>お試しの内容を元にした{{ site.trial.sampleChars }}の試し書き（サンプル原稿）をお送りします</li>
            <li>お試しは、本契約の「1回目のインタビュー」として数えます</li>
            <li>お試しから{{ site.trial.deductDays }}日以内に本契約された場合は、お試し料金をプラン料金から差し引きます</li>
          </ul>
        </div>

        <!-- 追加オプション -->
        <div class="pp-options">
          <p class="pp-options-title">追加オプション</p>
          <dl>
            <div v-for="o in site.options" :key="o.name" class="pp-options-row">
              <dt>{{ o.name }}</dt>
              <dd>{{ o.unit }} <span class="pp-num">{{ o.price }}</span>円</dd>
            </div>
          </dl>
        </div>

        <p class="pp-price-note">表示価格はすべて税込です。製本代・国内送料を含みます。</p>
      </div>
    </section>

    <!-- 流れ -->
    <section id="flow" class="pp-section pp-section-tint">
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

        <!-- 契約まわりの短縮版。詳細は /terms -->
        <dl class="pp-contract">
          <div>
            <dt>納期の目安</dt>
            <dd>{{ site.plans[0].period }}</dd>
          </div>
          <div>
            <dt>お支払い</dt>
            <dd>契約時に半金、原稿の最終承認後・印刷前に残金（銀行振込）</dd>
          </div>
          <div>
            <dt>途中でやめる場合</dt>
            <dd>
              お試し実施の3日前までは全額返金。お試しの後〜2回目のインタビューの前は、お試し料金を除き全額返金します。以降は進行に応じて精算します。ご本人のお気持ちを最優先します。<br />
              詳しくは<a :href="`${site.mainUrl}/terms`" class="pp-inline-link">ご契約・キャンセルについて</a>へ。
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- FAQ（客層別のタブ） -->
    <section id="faq" class="pp-section">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">FAQ</p>
        <h2 class="pp-title">よくある質問</h2>
        <div v-if="faqTabs.length > 1" class="pp-faq-tabs" role="tablist" aria-label="よくある質問の種類">
          <button
            v-for="(tab, i) in faqTabs"
            :id="`pp-faq-tab-${i}`"
            :key="tab.label"
            type="button"
            role="tab"
            class="pp-faq-tab"
            :class="{ 'is-active': faqTab === i }"
            :aria-selected="faqTab === i"
            :aria-controls="`pp-faq-panel-${i}`"
            @click="faqTab = i"
          >
            {{ tab.label }}
          </button>
        </div>
        <dl
          v-for="(tab, i) in faqTabs"
          v-show="faqTab === i"
          :id="`pp-faq-panel-${i}`"
          :key="tab.label"
          class="pp-faq"
          role="tabpanel"
          :aria-labelledby="`pp-faq-tab-${i}`"
        >
          <div v-for="q in tab.items" :key="q.q" class="pp-faq-item">
            <dt>{{ q.q }}</dt>
            <dd>
              {{ q.a }}
              <a v-if="q.link" :href="`${site.mainUrl}${q.link.to}`" class="pp-faq-link">{{ q.link.label }} →</a>
            </dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 聞き手 -->
    <section id="maker" class="pp-section pp-section-tint">
      <div class="pp-wrap pp-wrap-narrow">
        <p class="pp-label">INTERVIEWER</p>
        <h2 class="pp-title">聞き手</h2>
        <div class="pp-maker">
          <div class="pp-maker-name">
            <img class="pp-maker-avatar" src="/papa.jpg" :alt="`聞き手の${site.makerName}`" width="120" height="120" />
            <p>{{ site.makerName }}</p>
            <p class="pp-maker-fullname">（{{ site.makerFullName }}）</p>
            <p class="pp-maker-tagline"><span v-for="t in site.makerTagline.split('　')" :key="t" class="pp-nb">{{ t }}</span></p>
          </div>
          <div class="pp-maker-body">
            <h3>なぜ、この仕事をしているのか</h3>
            <p>小学生のころ、祖父から戦争の話や仕事の話を聞き、「かっこいいじいちゃんみたいに生きたい」と思いました。</p>
            <p>43歳でがんを経験し、死と向き合うなかで、内村鑑三が語った「後世に残せるものは、生き様である」という考えに感銘を受けました。それから、自分の心が納得する生き方を楽しみたいと思い、パパとして、がんサバイバーとして、島での日々を生きています。</p>
            <p>最初に自伝を作ったとき、語り手の喜びも悲しみも、その場にいるかのように伝わってきて、気づけば、語り手と同じように涙が流れていました。完成した本を受け取ったお客様は、「宝にしたい」と言ってくださいました。</p>
            <p>人生を聴き、本にして残すことは、その人の生き様を、未来へ渡すこと。私は、そう思っています。</p>

            <h3>「島のパパ」という名前について</h3>
            <p>パパとして、子育ても夫婦関係も、楽しく生きたいと思っています。同じ島のパパたちと、苦しさも楽しさも分かち合いたい。そんな思いを込めて、島のパパと名乗っています。</p>

            <h3>聴き方について</h3>
            <p>質問や意見をはさみすぎず、話したいことを、とことん話していただきます。受け止めて、聴く。その繰り返しです。</p>

            <h3>経歴</h3>
            <ul class="pp-maker-career">
              <li>コーチングを学び、傾聴の実践を重ねてきました</li>
              <li>広告・出版の制作現場を1年経験し、文章と編集に携わりました</li>
              <li>Web制作の経験があり、オンラインでの進行やデータの管理にも慣れています</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 最後の CTA -->
    <section id="contact" class="pp-cta">
      <div class="pp-wrap pp-cta-inner">
        <p class="pp-cta-sub">まずは、あなたの話を聞かせてください</p>
        <h2 class="pp-cta-title">ご相談は、<br class="pp-sp" />無料です</h2>
        <p class="pp-cta-note">どんな本にしたいか、まだ決まっていなくても大丈夫です。<br />お話だけでも、どうぞ。島内は対面も可です。</p>
        <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
          {{ page.cta }}
          <span class="pp-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="pp-cta-small">
          Googleフォームが開きます（返信は{{ site.replyWithin }}）。<br class="pp-sp" />
          送信前に<a :href="`${site.mainUrl}/privacy`" target="_blank" rel="noopener">プライバシーポリシー</a>をご確認ください。
        </p>
      </div>
    </section>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'shimano-papa' })

const isMenuOpen = ref(false)
const faqTab = ref(0)

/** プラン名を「・」の直後でだけ折り返す（「A5／判」のような途中改行を防ぐ） */
const titleSegments = (title: string) => title.split('・').map((t, i, all) => (i < all.length - 1 ? `${t}・` : t))

const kanjiNum = ['一', '二', '三', '四', '五', '六']

const [plan4] = site.plans
const tr = site.trial
const tm = site.terms
const extraBook = site.options[0]
type Faq = { q: string; a: string; link?: { to: string; label: string } }


const heroChapters = [
  '子どものころの暮らし',
  'いちばん大変だったとき',
  '出会いと、結婚',
  '子や孫に、伝えたいこと',
  'これから、どう過ごしたいか',
]
const heroTimeline = [
  { year: '1946', label: '誕生' },
  { year: '1964', label: '就職' },
  { year: '1972', label: '結婚' },
  { year: '1985', label: '家を建てる' },
  { year: '2026', label: '本をつくる' },
]
const selfLabel = '語り手'

const page = {
  topbar: 'インタビューでつくる、祖父母へ贈る自伝本',
  tag: '祖父母へ贈る本',
  catch: ['「聴いておきたかった」が、', 'まだ間に合ううちに。'],
  sub: ['お子さんやお孫さんから贈る、自伝本です。', '語るのは祖父母ご本人。聞き手がご自宅（またはオンライン）で、ゆっくりお話を伺います。'],
  cover: { sub: '祖父母の人生', title: ['語り継ぐ', '物語'] },
  cta: site.ctaLabel,
}

const entry = {
  story: {
    title: '聞いたつもりで、聞けていない話',
    quote: null,
    paras: [
      'おじいちゃんの若い頃の話、おばあちゃんの子どもの頃の話。',
      '聞いたつもりでいても、ちゃんと聞いたことは、意外と少ないものです。そして、その話を聞ける時間は、思っているより長くありません。',
    ],
  },
  blocks: [
    {
      id: 'gift', label: 'GIFT', title: '完成した本は、3冊',
      lead: 'この本は、お子さんやお孫さんから贈る、自伝本です。語るのは祖父母ご本人です。',
      items: [
        { who: '1冊', title: '祖父母の手元に', body: 'ご本人が、いつでも読み返せる1冊です。' },
        { who: '1冊', title: '贈った方に', body: 'お子さん・お孫さんの手元に残る1冊です。' },
        { who: '1冊', title: '家族で分ける1冊', body: 'きょうだいや親戚へ。追加の冊数も、お作りできます。' },
      ],
    },
    {
      id: 'worry', label: 'WORRY', title: '贈る側の不安に、先に答える',
      items: [
        { who: '不安①', title: '本人に、どう切り出せばいい？', body: '無料相談のときに、伝え方の文面も一緒に考えます。「インタビューを受けてみない？」の一言からで大丈夫です。' },
        { who: '不安②', title: '話すのが苦手な人でも大丈夫？', body: '順序立てて話す必要はありません。聞き手が問いで引き出します。' },
        { who: '不安③', title: '乗り気でなかったら？', body: '無理に進めません。お試し1回で様子を見ることもできます。' },
      ],
    },
  ],
  occasion: {
    title: '贈る節目の例',
    items: ['喜寿・米寿のお祝いに', '敬老の日に', '帰省のタイミングで'],
    note: '※親御さんへの贈り物にも、同じ形でお使いいただけます。',
  },
}

/* ---- 本の見本 ---- */
const bookChapters = heroChapters
const bookTimeline = heroTimeline
const familyTree = [
  { label: '一郎', x: 110, y: 64 },
  { label: '春子', x: 190, y: 64 },
  { label: '健', x: 90, y: 124 },
  { label: selfLabel, x: 210, y: 124, self: true },
  { label: '由美', x: 210, y: 172 },
]
const photos = [
  { x: 24, y: 30, r: -4, c: '#b9d68c' },
  { x: 100, y: 88, r: 3, c: '#e9d27a' },
  { x: 176, y: 28, r: -2, c: '#9fb8a3' },
]

/* ---- 共通の文言 ---- */
const abouts = [
  { title: '問いが、章になる', body: '年代順の自分史ではなく、人生の分かれ道を、聞き手の「問い」で章にします。' },
  { title: 'あなたの言葉のまま', body: '話した言葉がそのまま残るので、嘘がなく、熱量が伝わります。' },
  { title: '形に残る', body: '本と文字起こしデータが手元に残ります。何度でも読み返せます。' },
]

const flowSteps = [
  { title: '聴く', body: '無料相談・お試しのあと、全4回のインタビュー（1回90分。お試しが1回目になります）。Google Meetなどでお話を伺います。島内は対面も可です。' },
  { title: '編む', body: `問いごとに章を組み、原稿はご本人が確認します（修正は${site.terms.revisions}回まで）。` },
  { title: '遺す', body: `年表・家系図・写真を入れて仕上げ、最終承認のあと製本して、約2〜3か月でお届けします。文字起こしデータも一緒にお渡しします。` },
]

const commonFaq: Faq[] = [
  { q: '話すのが苦手です。うまく話せるでしょうか。', a: '順序立てて話す必要はありません。「たいした話ではない」と思っている方ほど、話しているうちに、ご自身でも忘れていたことが出てきます。聞き手が問いで引き出しますので、話したいことから、話したいだけ話してください。' },
  { q: '記憶があいまいで、年代や出来事の順番が分かりません。', a: '大丈夫です。年表や前後関係は、お話と写真を手がかりに、こちらで整理します。分からない部分は、無理に埋めません。' },
  { q: '話したくないことは、話さなくてもいいですか。', a: 'もちろんです。話したくないことは、話さなくて構いませんし、一度話したことを「本には載せない」と決めていただくこともできます。原稿は、必ずご本人が確認します。' },
  { q: 'どんな本になりますか。', a: '本文のほか、思い出の写真、年表、名前だけの簡単な家系図が入ります。約30ページのA5判小冊子です。できるだけご本人の言葉を大切にして、まとめます。' },
  { q: '事前に準備するものはありますか。', a: 'お試しインタビューの前は、準備は要りません。ご契約のあと、2回目のインタビューまでに、次の3つをお願いしています。①人生の振り返りシート（分かる範囲の年表と、忘れられない場面を5つ。年は分からなくても大丈夫です）②名前だけの簡単な家系図 ③印象に残っている写真（20枚以内）。どれも難しければ、1回目のあとに一緒に作りますので、ご安心ください。' },
  { q: '原稿は、何回まで直せますか。', a: `修正は${tm.revisions}回までです。内容の最終確認と承認は、ご本人にしていただきます。承認いただくまで、印刷はしません。` },
  { q: '録音や個人情報は、どう扱われますか。', a: `インタビューは、文字起こしと原稿制作のために録音します。録音データは、納品後${tm.audioKeepMonths}か月を目安に削除します。詳しくは、プライバシーポリシーをご覧ください。`, link: { to: '/privacy', label: 'プライバシーポリシー' } },
  { q: 'まず試してみることはできますか。', a: `できます。1回（${tr.minutes}分）のお試しインタビューを、${tr.price}円（税込）でお受けします。お試し後${tr.deductDays}日以内に本契約をされる場合は、お試し料金を差し引きます。` },
  { q: '4回で足りなくなったら？', a: `聞き切れない場合は、追加で1回（90分）を${site.options[2].price}円（税込）でお受けします。ページ数も約8ページ分増やせます。無理にお勧めすることはありません。` },
  { q: '途中でやめたくなったら？', a: 'ご本人のお気持ちを最優先します。お試し実施の3日前までは全額返金、お試しの後〜2回目の前は、お試し料金を除き全額返金します。それ以降は進行状況に応じた精算となります。詳しくは「ご契約・キャンセルについて」をご覧ください。', link: { to: '/terms', label: 'ご契約・キャンセルについて' } },
]
const refundFaq: Faq = { q: '贈り物として申し込んで、相手が断ったらどうなりますか。', a: 'お試しの後〜2回目のインタビューの前であれば、お試し料金を除き全額返金します（お試しの実施前なら、3日前までは全額返金です）。2回目以降は、進行状況に応じた精算になります。相手のお気持ちを最優先します。', link: { to: '/terms', label: 'ご契約・キャンセルについて' } }
const giftFaq: Faq = { q: 'プレゼントとして渡すとき、どんな形になりますか。', a: 'A5判の小冊子3冊を製本してお届けします。お祝いの日に、そのままお渡しいただけます。' }
const writeFaq: Faq = { q: '自分で書くのと、何が違いますか。', a: '聞き手の問いがあることで、自分では思い出さなかった記憶や言葉が出てきます。書く負担もありません。' }
const voices = null

const faqTabs: { label: string; items: Faq[] }[] = [
  {
    label: '贈る側のご不安',
    items: [
      refundFaq,
      giftFaq,
      { q: '本人に、どう切り出せばいいですか。', a: '無料相談のときに、伝え方の文面も一緒に考えます。言い方の例です。\n「おじいちゃん（おばあちゃん）の話を、ちゃんと聴いてみたいと思って」\n「話すのが嫌なら、断ってもいいよ。まず1回だけ試してみない？」\n「本を作ってあげる」と言うより、「話を聴かせてほしい」と伝えるほうが、受け入れてもらいやすいです。' },
      { q: '贈る側（私）がやることは？', a: '主に次の3つです。\n・ご本人への声かけ\n・日程調整（ご本人の予定を聞いて、こちらへ連絡）\n・オンラインの場合は、接続の準備（パソコンやスマホの設定）\nインタビューの間、原則はご本人とふたりでお話を伺います。ご希望があれば、同席も可能です。' },
      { q: '本の内容は、私（子や孫）も確認できますか。', a: '内容の最終確認と承認は、ご本人が行います。ご本人が了承された範囲で、共有していただけます。ご本人の同意なく、依頼者の方にお見せすることはありません。' },
      { q: '親が乗り気でないときは、どうなりますか。', a: '無理には進めません。ご本人が話したくないとお感じになった場合は、そこで中断します。お支払いは、進行状況に応じた精算になります（お試しの段階なら、お試し料金のみです）。' },
      { q: '高齢で、体調や記憶に不安があります。', a: 'ご本人のペースを最優先して、無理のない時間と回数で進めます。休憩を入れることもできます。体調や記憶のことで気がかりがあれば、お申し込み前に、遠慮なくご相談ください。' },
      { q: '遠方に住んでいて、インタビューに立ち会えません。', a: 'オンライン（Google Meetなど）でインタビューするので、遠方でも問題ありません。最初の接続だけ、ご家族に手伝っていただけると安心です。' },
      { q: '兄弟姉妹で、費用を分けられますか。', a: `お申し込みとお支払いは、代表の方1名にお願いしています。ご兄弟で分担される場合は、代表の方でまとめてお支払いください。\n本は3冊付きです。足りない場合は、追加1冊${extraBook.price}円でお作りできます。` },
      { q: '支払うのは誰ですか。', a: 'お申し込みいただいた方（贈る側）です。ご本人に、ご負担いただくことはありません。' },
    ],
  },
  { label: '共通', items: commonFaq },
]

const meta = {
  title: '祖父母へ贈る本 | 「聴いておきたかった」が、まだ間に合ううちに。',
  ogTitle: '祖父母へ贈る本 | 「聴いておきたかった」が、まだ間に合ううちに。',
  description: 'お子さんやお孫さんから、おじいちゃん・おばあちゃんへ贈る自伝本。聞き手がご自宅やオンラインでお話を伺い、話した言葉のまま1冊の本にします。完成した本は3冊。',
}

const description = `${meta.description}${plan4.title} ${plan4.price}円（税込）。1回${tr.minutes}分のお試しインタビュー${tr.price}円もあります。`

useHead({
  title: meta.title,
  htmlAttrs: { lang: 'ja' },
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: meta.ogTitle },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `https://${site.domain}/` },
    // URLを共有したときのサムネイル。画像の元は scripts/og/targets.json（node scripts/og/build.mjs で作り直す）
    { property: 'og:image', content: `https://${site.domain}/og.jpg` },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})
</script>

<style>
@import '~/assets/css/shimano-papa.css';
</style>
