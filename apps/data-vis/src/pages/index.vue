<template>
  <div class="dv-page">

    <!-- 上部の細い帯 -->
    <div class="dv-topbar">
      <div class="dv-wrap dv-topbar-inner">
        <span>データ可視化の受託制作</span>
        <span>運営：<a :href="site.prototyperUrl" target="_blank" rel="noopener">prototyper</a></span>
      </div>
    </div>

    <!-- ヘッダー -->
    <header class="dv-header">
      <div class="dv-wrap dv-header-inner">
        <a href="#top" class="dv-logo">
          <span class="dv-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" width="32" height="32">
              <rect x="3" y="17" width="6" height="12" rx="1.5" fill="var(--dv-main)" />
              <rect x="13" y="10" width="6" height="19" rx="1.5" fill="var(--dv-main)" />
              <rect x="23" y="4" width="6" height="25" rx="1.5" fill="var(--dv-accent)" />
            </svg>
          </span>
          <span class="dv-logo-text">
            <span class="dv-logo-name">data-vis</span>
            <span class="dv-logo-sub">眠っているデータを、伝わる形に</span>
          </span>
        </a>
        <nav class="dv-nav" :class="{ 'is-open': isMenuOpen }">
          <a href="#case" @click="isMenuOpen = false">事例</a>
          <a href="#samples" @click="isMenuOpen = false">作例</a>
          <a href="#how" @click="isMenuOpen = false">つくり方</a>
          <a href="#price" @click="isMenuOpen = false">料金</a>
          <a href="#faq" @click="isMenuOpen = false">よくある質問</a>
          <a :href="site.contactUrl" target="_blank" rel="noopener" class="dv-btn dv-btn-accent dv-nav-cta">無料相談</a>
        </nav>
        <button class="dv-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー -->
    <section id="top" class="dv-hero">
      <div class="dv-wrap dv-hero-inner">
        <div class="dv-hero-text">
          <p class="dv-hero-tag">公開データ・社内データ・個人の記録</p>
          <h1 class="dv-hero-catch">
            <span class="dv-nb">眠っているデータを、</span><br />
            <span class="dv-nb dv-hero-catch-em">思わず見たくなる形に。</span>
          </h1>
          <ul class="dv-hero-chips">
            <li>議事録・PDF</li>
            <li>Excel・CSV</li>
            <li>アンケート</li>
            <li>活動記録</li>
            <li>オープンデータ</li>
          </ul>
          <p class="dv-hero-sub">
            公開されているのに読まれない資料、社内に溜まったままの表、<br class="dv-pc" />ひとりで集めてきた記録。<br class="dv-pc" />
            加工とグラフ化で、誰が見ても中身が分かり、関心が持てる形に変えます。
          </p>
          <a :href="site.contactUrl" target="_blank" rel="noopener" class="dv-btn dv-btn-accent dv-btn-lg">
            無料相談
            <span class="dv-btn-arrow" aria-hidden="true">→</span>
          </a>
          <p class="dv-btn-note">60分・試作品もその場でお渡しします</p>
        </div>
        <div class="dv-hero-visual">
          <div class="dv-device">
            <div class="dv-device-bar"><i /><i /><i /></div>
            <img src="/images/miyako-trend.png" alt="宮古島市議会の議事録から、最近よく議論された言葉を大きく表示した画面" />
          </div>
          <div class="dv-device dv-device-sub">
            <img src="/images/miyako-network.png" alt="議事録の言葉どうしのつながりを表したネットワーク図" />
          </div>
          <div class="dv-badge">
            <span class="dv-badge-small">宮古島市議会の</span>
            <span class="dv-badge-mid">議事録PDF</span>
            <span class="dv-badge-num">160<small>本超</small></span>
            <span class="dv-badge-small">約20年分を可視化</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ヒーロー下のカード -->
    <div class="dv-wrap dv-hero-cards">
      <div class="dv-hero-card">
        <div class="dv-hero-card-icon">
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <circle cx="24" cy="24" r="17" fill="none" stroke="var(--dv-main)" stroke-width="3" />
            <path d="M24 13v11l7 5" fill="none" stroke="var(--dv-accent)" stroke-width="3" stroke-linecap="round" />
          </svg>
          <span>無料相談</span>
        </div>
        <div class="dv-hero-card-body">
          <p class="dv-hero-card-lead">60分の相談で、その場で試作</p>
          <p class="dv-hero-card-big"><span class="dv-num">0</span>円</p>
          <p class="dv-hero-card-note">※お一人様1件まで</p>
        </div>
      </div>
      <div class="dv-hero-card">
        <div class="dv-hero-card-icon">
          <svg viewBox="0 0 48 48" width="44" height="44" aria-hidden="true">
            <rect x="7" y="9" width="34" height="24" rx="3" fill="none" stroke="var(--dv-main)" stroke-width="3" />
            <path d="M14 27l7-7 5 4 8-9" fill="none" stroke="var(--dv-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M18 40h12" stroke="var(--dv-main)" stroke-width="3" stroke-linecap="round" />
          </svg>
          <span>制作費</span>
        </div>
        <div class="dv-hero-card-body">
          <p class="dv-hero-card-lead">可視化サイトの制作（目安）</p>
          <p class="dv-hero-card-big">約<span class="dv-num">{{ site.price.standard }}</span>{{ site.price.standardUnit }}</p>
          <p class="dv-hero-card-note">※宮古島市議会の事例と同じ規模の場合</p>
        </div>
      </div>
    </div>

    <!-- こんなデータ、眠っていませんか -->
    <section id="worries" class="dv-section">
      <div class="dv-wrap">
        <p class="dv-label">PROBLEM</p>
        <h2 class="dv-title">こんなデータ、<br class="dv-sp" />眠っていませんか？</h2>
        <p class="dv-lead">データは、置いてあるだけでは誰にも届きません。<br class="dv-pc" />見る人が「おもしろい」と感じる入り口をつくると、はじめて使われるようになります。</p>
        <div class="dv-worry-grid">
          <div v-for="w in worries" :key="w.title" class="dv-worry">
            <span class="dv-worry-who">{{ w.who }}</span>
            <h3 class="dv-worry-title">{{ w.title }}</h3>
            <ul>
              <li v-for="item in w.items" :key="item">{{ item }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 事例 -->
    <section id="case" class="dv-section dv-section-tint">
      <div class="dv-wrap">
        <p class="dv-label">CASE</p>
        <h2 class="dv-title">事例：宮古島市議会の議事録</h2>

        <div class="dv-ba">
          <div class="dv-ba-col dv-ba-before">
            <span class="dv-ba-tag">Before</span>
            <h3>PDFが並んでいるだけ</h3>
            <p>市議会の議事録は、市のサイトで会期ごとのPDFとして公開されています。その数は約20年分で160本以上。1本ずつ読んで市議会の動きをつかむのは、市民にはまず無理です。</p>
            <ul class="dv-pdf-list" aria-hidden="true">
              <li v-for="n in 6" :key="n"><span class="dv-pdf-icon">PDF</span>令和{{ 8 - Math.floor((n - 1) / 3) }}年 第{{ 4 - ((n - 1) % 3) }}回 定例会 会議録</li>
              <li class="dv-pdf-more">… ほか150本以上</li>
            </ul>
          </div>
          <div class="dv-ba-arrow" aria-hidden="true">
            <svg viewBox="0 0 40 40" width="40" height="40"><path d="M10 20h20M22 12l8 8-8 8" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </div>
          <div class="dv-ba-col dv-ba-after">
            <span class="dv-ba-tag">After</span>
            <h3>読まずに「眺めて、探せる」</h3>
            <p>文章を単語に分け、出てくる回数やつながりを数えて、5つの見え方にしました。気になった言葉をクリックすると、AIがその議論の要点をまとめて表示します。</p>
            <ul class="dv-after-points">
              <li>最近の議会で増えた話題が、ひと目で分かる</li>
              <li>2005年からの議論の流れを、言葉ひとつで追える</li>
              <li>議員ごとの関心の違いを、並べて比べられる</li>
            </ul>
            <a :href="site.miyakoUrl" target="_blank" rel="noopener" class="dv-btn dv-btn-main">実際に触ってみる <span aria-hidden="true">→</span></a>
          </div>
        </div>

        <div class="dv-features">
          <div v-for="(f, i) in miyakoFeatures" :key="f.title" class="dv-feature" :class="{ 'is-reverse': i % 2 === 1 }">
            <button class="dv-feature-img" type="button" @click="openLightbox(f.image, f.alt)">
              <img :src="f.image" :alt="f.alt" loading="lazy" />
            </button>
            <div class="dv-feature-text">
              <p class="dv-feature-num">FEATURE <span class="dv-num">{{ String(i + 1).padStart(2, '0') }}</span></p>
              <h3>{{ f.title }}</h3>
              <p>{{ f.body }}</p>
              <a :href="f.url" target="_blank" rel="noopener" class="dv-text-link">この画面を開く →</a>
            </div>
          </div>
        </div>

        <!-- 利用者の声 -->
        <div class="dv-voice">
          <div class="dv-voice-head">
            <span class="dv-voice-icon" aria-hidden="true">“</span>
            <div>
              <p class="dv-voice-label">使ってくださった方の声</p>
              <p class="dv-voice-person">宮古島市議会の議事録の可視化 ／ Aさん</p>
            </div>
          </div>
          <div class="dv-voice-grid">
            <div v-for="v in voices" :key="v.title" class="dv-voice-point">
              <h3>{{ v.title }}</h3>
              <p>{{ v.body }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 作例 -->
    <section id="samples" class="dv-section">
      <div class="dv-wrap">
        <p class="dv-label">SAMPLES</p>
        <h2 class="dv-title">ほかにも、こんなデータが変わります</h2>
        <p class="dv-lead">お持ちのデータに近いものを探してみてください。<br class="dv-pc" /><span class="dv-note-inline">※架空のデータで作った作例です</span></p>

        <div class="dv-sample-list">
          <!-- 作例1：観光統計 -->
          <article class="dv-sample">
            <header class="dv-sample-head">
              <span class="dv-sample-who">自治体・観光協会</span>
              <h3>観光客数の統計 → 季節と地域の「ムラ」が見える表</h3>
            </header>
            <div class="dv-sample-ba">
              <figure class="dv-sample-fig">
                <figcaption>Before ／ 年ごとの Excel</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="数字が並んだだけの表">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <g v-for="(row, r) in tourismTable" :key="r">
                    <text v-for="(cell, c) in row" :key="c" :x="14 + c * 47" :y="26 + r * 26" class="dv-svg-cell" :class="{ 'is-head': r === 0 || c === 0 }">{{ cell }}</text>
                    <line v-if="r < tourismTable.length - 1" x1="8" :y1="34 + r * 26" x2="292" :y2="34 + r * 26" stroke="var(--dv-line)" />
                  </g>
                </svg>
              </figure>
              <span class="dv-sample-arrow" aria-hidden="true">→</span>
              <figure class="dv-sample-fig">
                <figcaption>After ／ 月×地域のヒートマップ</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="月と地域ごとに色の濃さで観光客数を表したヒートマップ">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <text v-for="(a, r) in tourismAreas" :key="a" x="10" :y="44 + r * 26" class="dv-svg-label">{{ a }}</text>
                  <text v-for="m in 12" :key="'m' + m" :x="66 + (m - 1) * 19" y="22" class="dv-svg-label" text-anchor="middle">{{ m }}</text>
                  <g v-for="(row, r) in tourismHeat" :key="'h' + r">
                    <rect v-for="(v, c) in row" :key="c" :x="57 + c * 19" :y="30 + r * 26" width="17" height="22" rx="2" :fill="heatColor(v)" />
                  </g>
                  <rect x="188" y="27" width="21" height="132" rx="3" fill="none" stroke="var(--dv-accent)" stroke-width="2.5" />
                  <text x="198" y="173" class="dv-svg-label is-accent" text-anchor="middle">8月がピーク</text>
                </svg>
              </figure>
            </div>
            <p class="dv-sample-point"><strong>分かること：</strong>どの地域が、どの季節に混み、どこに伸びしろがあるか。数字の表では見落としていた「閑散期の差」が色で浮かびます。</p>
          </article>

          <!-- 作例2：アンケート自由記述 -->
          <article class="dv-sample">
            <header class="dv-sample-head">
              <span class="dv-sample-who">企業・お店</span>
              <h3>アンケートの自由記述 → 話題のマップと、不満の推移</h3>
            </header>
            <div class="dv-sample-ba">
              <figure class="dv-sample-fig">
                <figcaption>Before ／ 読みきれないコメントの山</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="自由記述のコメントが並んだ一覧">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <g v-for="(t, i) in surveyComments" :key="i">
                    <rect x="12" :y="12 + i * 27" width="276" height="21" rx="4" fill="var(--dv-base)" />
                    <text x="20" :y="27 + i * 27" class="dv-svg-cell">{{ t }}</text>
                  </g>
                </svg>
              </figure>
              <span class="dv-sample-arrow" aria-hidden="true">→</span>
              <figure class="dv-sample-fig">
                <figcaption>After ／ 話題のかたまりと件数の推移</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="話題ごとの円と、待ち時間への不満が増えている折れ線">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <line v-for="e in surveyEdges" :key="e.key" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" stroke="var(--dv-main)" stroke-opacity=".3" stroke-width="2" />
                  <g v-for="b in surveyBubbles" :key="b.label">
                    <circle :cx="b.x" :cy="b.y" :r="b.r" :fill="b.hot ? 'var(--dv-accent)' : 'var(--dv-main)'" :fill-opacity="b.hot ? 0.9 : 0.75" />
                    <text :x="b.x" :y="b.y + 4" class="dv-svg-bubble" text-anchor="middle">{{ b.label }}</text>
                  </g>
                  <line x1="190" y1="160" x2="290" y2="160" stroke="var(--dv-line)" />
                  <polyline :points="surveyTrend" fill="none" stroke="var(--dv-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
                  <text x="290" y="88" class="dv-svg-label is-accent" text-anchor="end">「待ち時間」が増加</text>
                </svg>
              </figure>
            </div>
            <p class="dv-sample-point"><strong>分かること：</strong>何について書かれているかを話題ごとにまとめ、最近増えている不満を見つけます。宮古島市議会の事例と同じ、文章を数えて可視化する技術の応用です。</p>
          </article>

          <!-- 作例3：活動記録 -->
          <article class="dv-sample">
            <header class="dv-sample-head">
              <span class="dv-sample-who">個人・団体</span>
              <h3>活動記録の表 → 地図と月ごとの活動量</h3>
            </header>
            <div class="dv-sample-ba">
              <figure class="dv-sample-fig">
                <figcaption>Before ／ 日付と場所を書きためた表</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="日付・場所・参加人数を並べた表">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <g v-for="(row, r) in activityTable" :key="r">
                    <text x="14" :y="26 + r * 26" class="dv-svg-cell" :class="{ 'is-head': r === 0 }">{{ row[0] }}</text>
                    <text x="96" :y="26 + r * 26" class="dv-svg-cell" :class="{ 'is-head': r === 0 }">{{ row[1] }}</text>
                    <text x="214" :y="26 + r * 26" class="dv-svg-cell" :class="{ 'is-head': r === 0 }">{{ row[2] }}</text>
                    <line v-if="r < activityTable.length - 1" x1="8" :y1="34 + r * 26" x2="292" :y2="34 + r * 26" stroke="var(--dv-line)" />
                  </g>
                </svg>
              </figure>
              <span class="dv-sample-arrow" aria-hidden="true">→</span>
              <figure class="dv-sample-fig">
                <figcaption>After ／ 活動した場所と、続けてきた量</figcaption>
                <svg viewBox="0 0 300 180" class="dv-svg" role="img" aria-label="活動場所を地図上の点で、月ごとの活動回数を棒グラフで表した図">
                  <rect x="0" y="0" width="300" height="180" rx="6" fill="#fff" stroke="var(--dv-line)" />
                  <path d="M22 120 C 30 70, 70 40, 110 46 S 150 90, 138 128 S 60 150, 22 120 Z" fill="var(--dv-base)" stroke="var(--dv-line)" />
                  <circle v-for="p in activityPoints" :key="p.x + '-' + p.y" :cx="p.x" :cy="p.y" :r="p.r" fill="var(--dv-accent)" fill-opacity=".8" />
                  <text x="22" y="164" class="dv-svg-label">活動した場所（点＝回数）</text>
                  <line x1="168" y1="150" x2="290" y2="150" stroke="var(--dv-line)" />
                  <rect v-for="(v, i) in activityBars" :key="'b' + i" :x="172 + i * 10" :y="150 - v" width="7" :height="v" rx="1.5" fill="var(--dv-main)" />
                  <text x="290" y="166" class="dv-svg-label" text-anchor="end">月ごとの回数</text>
                </svg>
              </figure>
            </div>
            <p class="dv-sample-point"><strong>分かること：</strong>どこで、どれだけ続けてきたかが、1枚で伝わります。報告書やホームページ、支援してくれる方への説明にそのまま使えます。</p>
          </article>
        </div>
      </div>
    </section>

    <!-- つくり方 -->
    <section id="how" class="dv-section dv-section-main">
      <div class="dv-wrap">
        <p class="dv-label is-light">HOW</p>
        <h2 class="dv-title is-light">どうやって「伝わる形」に変えるのか</h2>
        <ol class="dv-how-list">
          <li v-for="(s, i) in howSteps" :key="s.title" class="dv-how">
            <span class="dv-how-num dv-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </li>
        </ol>
        <div class="dv-tools">
          <p class="dv-tools-label">見せ方の引き出し</p>
          <ul>
            <li v-for="t in vizTypes" :key="t">{{ t }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- つくっている人 -->
    <section id="maker" class="dv-section dv-section-tint">
      <div class="dv-wrap">
        <p class="dv-label">MAKER</p>
        <h2 class="dv-title">つくっている人</h2>
        <div class="dv-maker">
          <div class="dv-maker-origin">
            <p class="dv-maker-origin-label">原点</p>
            <p class="dv-maker-quote">「表形式の検索キーワードのランキングは見にくいから、ネットワーク図にしてはどうか？」</p>
            <p class="dv-maker-cite">— 社内でツールを使ってくれていた一人の言葉</p>
            <ol class="dv-maker-steps">
              <li>その一言を、そのまま試作してみた</li>
              <li>思いがけず大きな反響があった</li>
              <li>いまは <a :href="site.dsInsightUrl" target="_blank" rel="noopener">DS.INSIGHT Basic</a> の主力機能のひとつになっている</li>
            </ol>
          </div>
          <div class="dv-maker-body">
            <p>大手インターネット企業で17年、大規模なデータを扱う分析サービスの企画・開発に携わってきました。性別・年齢・地域といった切り口に合わせて、ネットワーク図・ヒートマップ・時系列など、目的に合った見せ方を設計しています。</p>
            <p>大切にしているのは、データを見る人が「何を知りたいのか」から考えることです。最初の一言を聞いたら、その場で動くものを作り、見ながら一緒に磨いていきます。</p>
            <p>データ可視化のほか、業務ツールやホームページの制作も行っています。</p>
            <a :href="site.prototyperUrl" target="_blank" rel="noopener" class="dv-text-link">ほかの制作実績（prototyper）を見る →</a>
          </div>
        </div>
      </div>
    </section>

    <!-- 料金 -->
    <section id="price" class="dv-section">
      <div class="dv-wrap">
        <p class="dv-label">PRICE</p>
        <h2 class="dv-title">料金の目安</h2>
        <div class="dv-price-grid">
          <div class="dv-price is-free">
            <p class="dv-price-name">無料相談</p>
            <p class="dv-price-amount"><span class="dv-num">0</span>円</p>
            <ul>
              <li>60分のオンライン相談</li>
              <li>お聞きした内容で、その場で試作をお渡し</li>
              <li>お一人様1件まで</li>
            </ul>
          </div>
          <div class="dv-price">
            <p class="dv-price-name">可視化サイトの制作</p>
            <p class="dv-price-amount">約<span class="dv-num">{{ site.price.standard }}</span>{{ site.price.standardUnit }}</p>
            <ul>
              <li>データの取り出し・整理から公開まで</li>
              <li>宮古島市議会の事例（PDF 160本超・5画面）の規模での目安</li>
              <li>グラフ数枚の小さなものなら、もっと抑えられます</li>
            </ul>
          </div>
          <div class="dv-price">
            <p class="dv-price-name">更新・運用</p>
            <p class="dv-price-amount is-text">ご相談</p>
            <ul>
              <li>新しいデータの自動取り込み</li>
              <li>見せ方の追加・改善</li>
              <li>宮古島市議会の事例では、毎月自動で最新の議会を分析</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 進め方 -->
    <section id="flow" class="dv-section dv-section-tint">
      <div class="dv-wrap">
        <p class="dv-label">FLOW</p>
        <h2 class="dv-title">ご依頼の流れ</h2>
        <ol class="dv-flow">
          <li v-for="(f, i) in flowSteps" :key="f.title">
            <span class="dv-flow-num">STEP <span class="dv-num">{{ i + 1 }}</span></span>
            <h3>{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- FAQ -->
    <section id="faq" class="dv-section">
      <div class="dv-wrap dv-wrap-narrow">
        <p class="dv-label">FAQ</p>
        <h2 class="dv-title">よくある質問</h2>
        <dl class="dv-faq">
          <div v-for="q in faqs" :key="q.q" class="dv-faq-item">
            <dt>{{ q.q }}</dt>
            <dd>{{ q.a }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 最後の CTA -->
    <section id="contact" class="dv-cta">
      <div class="dv-wrap dv-cta-inner">
        <p class="dv-cta-sub">まずは、お手元のデータを見せてください</p>
        <h2 class="dv-cta-title">60分の無料相談で、<br class="dv-sp" />その場で試作をお渡しします</h2>
        <p class="dv-cta-note">データの一部だけでも、「こんなデータがある」というお話だけでも大丈夫です。※お一人様1件まで</p>
        <a :href="site.contactUrl" target="_blank" rel="noopener" class="dv-btn dv-btn-accent dv-btn-lg">
          無料相談
          <span class="dv-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="dv-btn-note">60分・試作品もその場でお渡しします</p>
      </div>
    </section>

    <footer class="dv-footer">
      <div class="dv-wrap dv-footer-inner">
        <span>© data-vis ／ {{ site.domain }}</span>
        <span class="dv-footer-links">
          <NuxtLink to="/legal">特定商取引法に基づく表記</NuxtLink>
          <a :href="site.prototyperUrl" target="_blank" rel="noopener">運営：prototyper</a>
        </span>
      </div>
    </footer>

    <!-- スクリーンショットの拡大表示 -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="dv-lightbox" @click="closeLightbox">
        <button class="dv-lightbox-close" aria-label="閉じる" @click="closeLightbox">×</button>
        <img :src="lightbox.src" :alt="lightbox.alt" @click.stop />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'data-vis' })

const isMenuOpen = ref(false)

const worries = [
  
  {
    who: '企業・お店',
    title: '溜まっているのに、使われていない',
    items: ['売上・問い合わせ履歴が Excel のまま', 'アンケートの自由記述を、誰も読みきれない'],
  },
  {
    who: '自治体・団体',
    title: '公開しているのに、見られていない',
    items: ['議事録・統計・予算書が PDF で並んでいるだけ', 'オープンデータを出したが、反応がない'],
  },
  {
    who: '個人',
    title: '集めたのに、うまく伝わらない',
    items: ['続けてきた活動の記録を、人に見せたい', '調べてきたデータを、分かりやすく発表したい'],
  },
]

const miyakoFeatures = [
  {
    title: '最近の議会で増えた言葉が、大きく浮かび上がる',
    body: '最新の議会で初めて出てきた言葉や、以前より多く議論されるようになった言葉を大きく表示します。いま何が議題の中心かを、読まずに一目でつかめます。',
    image: '/images/miyako-trend.png',
    alt: '最近の議会でよく議論された言葉の画面',
    url: 'https://prototype.insightlens.jp/miyako',
  },
  {
    title: 'つながりの図で、議論の全体像を見る',
    body: '暮らし・医療・子ども・観光・防災など9つの分野ごとに、よく議論された言葉を円の大きさで、一緒に語られた言葉どうしを線で表しました。何と何が結びついているかが分かります。',
    image: '/images/miyako-network.png',
    alt: '言葉どうしのつながりを表したネットワーク図',
    url: 'https://prototype.insightlens.jp/miyako/network',
  },
  {
    title: '気になる言葉から、2005年以降の流れを追える',
    body: '言葉をひとつ入れると、それが語られた会議を AI が時代ごとにまとめます。いつ何が話され、どう変わってきたかを順にたどれます。',
    image: '/images/miyako-keyword.png',
    alt: 'キーワードの議論の移り変わりを時代ごとにまとめた画面',
    url: 'https://prototype.insightlens.jp/miyako/keyword',
  },
  {
    title: 'その年らしい話題が、色の濃さで分かる',
    body: '年ごとに、どんな話題が特徴的だったかを色の濃さで表しました。台風や災害の年に関連する言葉が濃くなるなど、時代ごとの関心の移り変わりが見えます。',
    image: '/images/miyako-yearly.png',
    alt: '年ごとの特徴的な話題を色の濃さで表したヒートマップ',
    url: 'https://prototype.insightlens.jp/miyako/yearly',
  },
  {
    title: '議員ごとの関心を、並べて比べられる',
    body: 'どの議員が、どの分野の話を多くしているかを一覧にしました。議員を選ぶと、その人がよく使う言葉と、その議論の要約が表示されます。',
    image: '/images/miyako-member.png',
    alt: '議員ごとの関心分野を表したヒートマップ',
    url: 'https://prototype.insightlens.jp/miyako/member',
  },
]

const voices = [
  {
    title: '誰も読まない議事録に、入り口ができた',
    body: '誰も読まない議事録を、年・議員・キーワードの3軸で見られるようにした点がよかった。市民は情報量が多いと触りたくなくなるが、切り口があれば入り口になる。',
  },
  {
    title: 'クリックすると要約が出る。長い議事録でも読める',
    body: 'キーワードをクリックすると、右の画面に要約が出る点も助かる。実際の議事録は長くて冗長なので、要約で読めるのはありがたい。',
  },
  {
    title: 'ネットワーク図で全体をつかめ、探索できる',
    body: '全体図でつながりが見え、「ここをクリックしてみよう」と探索できる点がいい。議員ごとの発言の偏りも見えるので、どの議員が何に関心を持っているかが分かる。',
  },
]

/* ---- 作例（架空のデータ） ---- */

const tourismAreas = ['北部', '中部', '南部', '海岸', '山間']

const tourismTable = [
  ['地域', '1月', '2月', '3月', '…', '12月'],
  ['北部', '12,480', '11,902', '15,377', '…', '13,045'],
  ['中部', '30,115', '28,760', '33,208', '…', '31,992'],
  ['南部', '8,231', '7,904', '9,880', '…', '8,617'],
  ['海岸', '5,402', '5,118', '7,936', '…', '6,021'],
  ['山間', '3,987', '3,512', '4,410', '…', '4,105'],
]

/** 0〜1 の値。夏の海岸・秋の山間が濃くなるように置いた */
const tourismHeat = [
  [0.35, 0.3, 0.45, 0.5, 0.55, 0.5, 0.7, 0.85, 0.55, 0.45, 0.4, 0.4],
  [0.6, 0.55, 0.65, 0.7, 0.75, 0.6, 0.8, 0.95, 0.7, 0.7, 0.65, 0.7],
  [0.2, 0.2, 0.3, 0.35, 0.35, 0.3, 0.5, 0.6, 0.35, 0.3, 0.25, 0.25],
  [0.1, 0.1, 0.2, 0.3, 0.45, 0.6, 0.95, 1, 0.55, 0.25, 0.1, 0.1],
  [0.15, 0.1, 0.2, 0.35, 0.4, 0.3, 0.35, 0.4, 0.5, 0.85, 0.9, 0.3],
]

/** 薄い水色 → メインの青。値が大きいほど濃い */
function heatColor(v: number) {
  const from = [232, 241, 252]
  const to = [24, 92, 184]
  const c = from.map((f, i) => Math.round(f + (to[i]! - f) * v))
  return `rgb(${c.join(',')})`
}

const surveyComments = [
  'レジの待ち時間が長くて困りました…',
  'スタッフの対応がとても丁寧でした',
  '駐車場が狭くて停めにくい',
  '週末は待ち時間が30分以上…',
  '新商品の味が良かったです',
  '……（ほか 1,200 件）',
]

const surveyBubbles = [
  { label: '待ち時間', x: 66, y: 66, r: 34, hot: true },
  { label: '接客', x: 128, y: 44, r: 22, hot: false },
  { label: '駐車場', x: 40, y: 132, r: 20, hot: false },
  { label: '味', x: 120, y: 118, r: 26, hot: false },
  { label: '価格', x: 160, y: 82, r: 15, hot: false },
]

/** 一緒に書かれやすい話題どうしを結ぶ線（ラベルで指定） */
const surveyEdges = [
  ['待ち時間', '接客'],
  ['待ち時間', '駐車場'],
  ['待ち時間', '味'],
  ['接客', '味'],
  ['味', '価格'],
].flatMap(([a, b]) => {
  const from = surveyBubbles.find((x) => x.label === a)
  const to = surveyBubbles.find((x) => x.label === b)
  return from && to ? [{ key: `${a}-${b}`, x1: from.x, y1: from.y, x2: to.x, y2: to.y }] : []
})

const surveyTrend = '192,150 212,146 232,140 252,128 272,110 290,96'

const activityTable = [
  ['日付', '場所', '参加'],
  ['2026/04/05', '中央公園', '12人'],
  ['2026/04/19', '河川敷グラウンド', '8人'],
  ['2026/05/03', '中央公園', '15人'],
  ['2026/05/17', '市民センター', '6人'],
  ['……', '（ほか 86 件）', ''],
]

const activityPoints = [
  { x: 58, y: 84, r: 11 },
  { x: 92, y: 66, r: 7 },
  { x: 104, y: 110, r: 9 },
  { x: 48, y: 118, r: 5 },
  { x: 76, y: 128, r: 6 },
  { x: 124, y: 88, r: 4 },
]

const activityBars = [22, 30, 42, 50, 46, 38, 60, 72, 54, 48, 40, 34]

/* ---- つくり方・流れ・FAQ ---- */

const howSteps = [
  { title: '集める', body: 'PDF・Excel・CSV・紙の資料など、形はそのままでお預かりします。公開されているデータなら、取りに行くところから行います。' },
  { title: '整える', body: 'PDF から文字を取り出し、表記ゆれをそろえ、文章は単語に分けて数えられる形にします。いちばん手間がかかり、いちばん差が出る工程です。' },
  { title: '切り口を決める', body: '「誰が、何を知りたいのか」から、時間・場所・人・話題など、どの軸で見せるかを決めます。' },
  { title: '見せる', body: 'グラフや図を、クリックして探れる画面にします。AI による要約を添えて、元の文書を読まなくても中身が分かるようにします。' },
]

const vizTypes = ['ワードクラウド', 'ネットワーク図', 'ヒートマップ', '時系列グラフ', '地図', 'ランキング', 'AI による要約', '検索']

const flowSteps = [
  { title: 'フォームから無料相談', body: 'どんなデータをお持ちか、誰に見せたいかを簡単にお書きください。' },
  { title: '無料相談（60分）', body: 'お話を伺いながら、その場で試作を作ってお渡しします。' },
  { title: '内容とお見積り', body: '試作を見ながら、見せ方や画面の数を決め、お見積りをお出しします。' },
  { title: '制作・公開', body: '途中の画面をお見せしながら仕上げ、公開します。公開後の更新もご相談ください。' },
]

const faqs = [
  { q: 'PDF や紙の資料しかなくても大丈夫ですか？', a: '大丈夫です。PDF からの文字の取り出しにも対応しています。紙の資料は、スキャンや写真からの読み取りをご相談ください。' },
  { q: '社外に出せないデータでも相談できますか？', a: 'はい。公開せず、社内の方だけが見られる画面として作ることもできます。無料相談では、データの中身ではなく「どんなデータか」のお話だけでも構いません。' },
  { q: '無料相談では何を用意すればいいですか？', a: 'データの一部（数十行でも）があれば、より具体的な試作をお渡しできます。ご用意がなくても、お話を伺って試作します。' },
  { q: '制作にはどのくらいの期間がかかりますか？', a: 'データの量と画面の数によって変わります。無料相談のあと、お見積りと一緒にお伝えします。' },
  { q: 'データが増えたら、更新できますか？', a: 'できます。新しいデータを自動で取り込む仕組みも作れます。宮古島市議会の事例では、毎月自動で最新の議会を分析しています。' },
]

/* ---- スクリーンショットの拡大表示 ---- */

const lightbox = reactive({ open: false, src: '', alt: '' })

function openLightbox(src: string, alt: string) {
  lightbox.src = src
  lightbox.alt = alt
  lightbox.open = true
}

function closeLightbox() {
  lightbox.open = false
}

useHead({
  title: 'data-vis | 眠っているデータを、思わず見たくなる形に',
  htmlAttrs: { lang: 'ja' },
  meta: [
    {
      name: 'description',
      content:
        '公開されているのに読まれないオープンデータ、社内に溜まったままの Excel、個人の活動記録を、加工とグラフ化で関心が持てる形に変えるデータ可視化の受託制作。宮古島市議会の議事録PDF 160本超を可視化した事例あり。30分の無料相談で、その場で試作をお渡しします。',
    },
    { property: 'og:title', content: 'data-vis | 眠っているデータを、思わず見たくなる形に' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: `https://${site.domain}/` },
    { property: 'og:image', content: `https://${site.domain}/images/miyako-trend.png` },
  ],
})
</script>

<style>
@import '~/assets/css/data-vis.css';
</style>
