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
          <a href="#maker" @click="isMenuOpen = false">聞き手</a>
          <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-nav-cta">{{ site.ctaLabel }}</a>
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
            <li>インタビュー3回・7回</li>
            <li>写真・年表・家系図入り</li>
            <li>A5判・製本3冊</li>
          </ul>
          <p class="pp-hero-sub">
            聞き手との対話を重ねて、あなたが話した言葉のまま、<br class="pp-pc" />1冊の本にします。<br class="pp-pc" />
            自分の振り返りに。家族への贈り物に。
          </p>
          <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
            {{ site.ctaLabel }}
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
            <span class="pp-cover-sub">五つの問いから</span>
            <span class="pp-cover-title">歩いて<br />きた道</span>
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
          <span>{{ p.recommended ? 'おすすめ' : p.short }}</span>
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
          <li>約<span class="pp-num">30</span>ページ／約<span class="pp-num">70</span>ページ</li>
          <li>A5判・製本<span class="pp-num">3</span>冊</li>
          <li>文字起こしデータもお渡し</li>
        </ul>
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
            <dd>{{ site.plans.map((p) => `${p.short}：${p.period}`).join('／') }}</dd>
          </div>
          <div>
            <dt>お支払い</dt>
            <dd>契約時に半金、原稿の最終承認後・印刷前に残金（銀行振込）</dd>
          </div>
          <div>
            <dt>途中でやめる場合</dt>
            <dd>
              初回インタビュー前は全額返金。進行に応じて精算します。ご本人のお気持ちを最優先します。<br />
              詳しくは<NuxtLink to="/terms" class="pp-inline-link">ご契約・キャンセルについて</NuxtLink>へ。
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
        <div class="pp-faq-tabs" role="tablist" aria-label="よくある質問の種類">
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
              <NuxtLink v-if="q.link" :to="q.link.to" class="pp-faq-link">{{ q.link.label }} →</NuxtLink>
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
        <p class="pp-cta-note">お話だけでも、どうぞ。島内は対面も可です。<br />どんな本にしたいか、まだ決まっていなくても大丈夫です。</p>
        <a :href="site.formUrl" target="_blank" rel="noopener" class="pp-btn pp-btn-accent pp-btn-lg">
          {{ site.ctaLabel }}
          <span class="pp-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="pp-cta-small">
          Googleフォームが開きます（返信は{{ site.replyWithin }}）。<br class="pp-sp" />
          送信前に<NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>をご確認ください。
        </p>
      </div>
    </section>

    <PpFooter />
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
  { title: '聴く', body: `無料相談・お試しのあと、インタビューを3回または7回（1回90分〜2時間）。Google Meetなどでお話を伺います。島内は対面も可です。` },
  { title: '編む', body: `全文を読み込み、大切なテーマを選んで、問いごとに章を組みます。原稿はご本人が確認します（修正は${site.terms.revisions}回まで）。` },
  { title: '遺す', body: `年表・家系図・写真を入れて仕上げ、原稿の最終承認後、${site.terms.deliveryAfterApproval}で製本してお届けします。文字起こしデータも一緒にお渡しします。` },
]

type Faq = { q: string; a: string; link?: { to: string; label: string } }

const [plan3, plan7] = site.plans
const tr = site.trial
const tm = site.terms
const extraBook = site.options[0]

const faqTabs: { label: string; items: Faq[] }[] = [
  {
    label: 'ご自身の人生を',
    items: [
      { q: '話すのが苦手です。うまく話せるでしょうか。', a: '順序立てて話す必要はありません。「たいした話ではない」と思っている方ほど、話しているうちに、ご自身でも忘れていたことが出てきます。話したいことから、話したいだけ話してください。こちらは、聴くことに専念します。' },
      { q: '記憶があいまいで、年代や出来事の順番が分かりません。', a: '大丈夫です。年表や前後関係は、お話と写真を手がかりに、こちらで整理します。分からない部分は、無理に埋めません。' },
      { q: '話したくないことは、話さなくてもいいですか。', a: 'もちろんです。話したくないことは、話さなくて構いませんし、一度話したことを「本には載せない」と決めていただくこともできます。原稿は、必ずご本人が確認します。' },
      { q: 'どんな本になりますか。', a: '本文のほか、思い出の写真、自分史年表、簡単な家系図が入ります。3回プランは約30ページのA5判小冊子、7回プランは約70ページのA5判です。できるだけご本人の言葉を大切にして、まとめます。' },
      { q: '事前に準備するものはありますか。', a: '特にありません。お手元に、思い出の写真や古いアルバムがあれば、お送りください（枚数の上限はプランによります）。話す内容をまとめておく必要はありません。' },
      { q: '原稿は、何回まで直せますか。', a: `修正は${tm.revisions}回までです。内容の最終確認と承認は、ご本人にしていただきます。承認いただくまで、印刷はしません。` },
      { q: '録音や個人情報は、どう扱われますか。', a: `インタビューは、文字起こしと原稿制作のために録音します。録音データは、納品後${tm.audioKeepMonths}か月を目安に削除します。詳しくは、プライバシーポリシーをご覧ください。`, link: { to: '/privacy', label: 'プライバシーポリシー' } },
      { q: 'まず試してみることはできますか。', a: `できます。1回（${tr.minutes}分）のお試しインタビューを、${tr.price}円（税込）でお受けします。お試し後${tr.deductDays}日以内に本契約をされる場合は、お試し料金を差し引きます。` },
      { q: '途中でやめたくなったら？', a: 'ご本人のお気持ちを最優先します。進行状況に応じた精算となります。詳しくは「ご契約・キャンセルについて」をご覧ください。', link: { to: '/terms', label: 'ご契約・キャンセルについて' } },
    ],
  },
  {
    label: '親・家族に贈る',
    items: [
      { q: '親が話してくれるか不安です。', a: `その不安は、とても自然なものです。まずは、お試しインタビュー（${tr.minutes}分・${tr.price}円）で、ご本人が話せるか、話したいと思えるかを、確かめてください。お試しだけで終わっても構いません。無理に本契約へ進めることはありません。` },
      { q: '親に、どう切り出せばいいですか。', a: '言い方の例です。\n「お父さん（お母さん）の話を、ちゃんと聴いてみたいと思って」\n「孫に、おじいちゃんの話を残してあげたいんだ」\n「話すのが嫌なら、断ってもいいよ。まず1回だけ試してみない？」\n「本を作ってあげる」と言うより、「話を聴かせてほしい」と伝えるほうが、受け入れてもらいやすいです。' },
      { q: '贈る側（私）がやることは？', a: '主に次の3つです。\n・ご本人への声かけ（上のような言い方で）\n・日程調整（ご本人の予定を聞いて、こちらへ連絡）\n・オンラインの場合は、接続の準備（パソコンやスマホの設定）\nインタビューの間、原則はご本人とふたりでお話を伺います。ご希望があれば、同席も可能です。' },
      { q: '本の内容は、私（子ども）も確認できますか。', a: '内容の最終確認と承認は、ご本人（親御さん）が行います。ご本人が了承された範囲で、共有していただけます。ご本人の同意なく、依頼者の方にお見せすることはありません。' },
      { q: '親が乗り気でないときは、どうなりますか。', a: '無理には進めません。ご本人が話したくないとお感じになった場合は、そこで中断します。お支払いは、進行状況に応じた精算になります（お試しの段階なら、お試し料金のみです）。' },
      { q: '高齢で、体調や記憶に不安があります。', a: 'ご本人のペースを最優先して、無理のない時間と回数で進めます。休憩を入れることもできます。体調や記憶のことで気がかりがあれば、お申し込み前に、遠慮なくご相談ください。' },
      { q: '遠方に住んでいて、インタビューに立ち会えません。', a: 'オンライン（Google Meetなど）でインタビューするので、遠方でも問題ありません。最初の接続だけ、ご家族に手伝っていただけると安心です。' },
      { q: '兄弟姉妹で、費用を分けられますか。', a: `お申し込みとお支払いは、代表の方1名にお願いしています。ご兄弟で分担される場合は、代表の方でまとめてお支払いください。\n本は、どちらのプランも3冊付きです。足りない場合は、追加1冊${extraBook.price}円でお作りできます。` },
      { q: '支払うのは誰ですか。', a: 'お申し込みいただいた方（贈る側）です。ご本人（親御さん）に、ご負担いただくことはありません。' },
    ],
  },
]

const description =
  `聞き手との対話を重ねて、あなたが話した言葉のまま1冊の本にする自伝本づくり。写真・年表・家系図入り。${plan3.title} ${plan3.price}円、${plan7.title} ${plan7.price}円（税込）。1回${tr.minutes}分のお試しインタビュー${tr.price}円もあります。`

useHead({
  title: '人生のインタビュー | 人は誰もが、語る価値のある人生を生きている。',
  htmlAttrs: { lang: 'ja' },
  meta: [
    { name: 'description', content: description },
    { property: 'og:title', content: '人生のインタビュー | あなたの人生を、1冊の本に' },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `https://${site.domain}/` },
    // URLを共有したときのサムネイル。画像の元は scripts/og/targets.json（node scripts/og/build.mjs で作り直す）
    { property: 'og:image', content: 'https://shimano-papa.insightlens.jp/og.jpg' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
})
</script>

<style>
@import '~/assets/css/shimano-papa.css';
</style>
