<template>
  <div class="ac-page">

    <!-- ナビゲーション -->
    <nav class="ac-nav">
      <div class="ac-nav-inner">
        <span class="ac-nav-logo">prototyper</span>
        <ul class="ac-nav-links">
          <li><a href="#services">できること</a></li>
          <li><a href="#process">進め方</a></li>
          <li><a href="#portfolio">実績</a></li>
          <li><a href="#about">私について</a></li>
          <li><a href="#terms">ご相談と費用</a></li>
          <li><a href="#contact">お問い合わせ</a></li>
        </ul>
      </div>
    </nav>

    <!-- ヒーロー -->
    <section class="ac-hero">
      <div class="ac-wrap">
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-eyebrow">Your Words &rarr; Working Prototype</span>
            <h1 class="hero-catch">
              答えは、いつも<br />
              <span>あなたの中にある。</span>
            </h1>
            <div class="hero-sub">
              <p>「こういうのが欲しいかも」——まだ形になっていない、その段階のお話を聞かせてください。</p>
              <p>
                ものづくりの主役は、つくる人ではありません。毎日その現場にいる<strong>あなた</strong>です。<br />
                私の仕事は、あなたの中にすでにある答えを、触れる形にして一緒に育てることです。
              </p>
              <p>
                ITのことは分からなくて大丈夫です。専門用語は使いません。<br />
                あなたの言葉のまま、話してください。
              </p>
            </div>
            <a href="#contact" class="hero-cta">
              まずは話を聞かせてください
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div class="hero-viz-deco" aria-hidden="true">
            <svg viewBox="0 0 380 420" fill="none" xmlns="http://www.w3.org/2000/svg" class="hero-flow-svg">
              <!-- お客さんの声 -->
              <text x="8" y="10" font-family="'IBM Plex Mono',monospace" font-size="8" font-weight="500" fill="rgba(27,95,217,0.42)" letter-spacing="0.14em">YOUR WORDS</text>
              <g class="hero-bubbles">
                <g class="hero-bubble">
                  <rect x="6" y="18" width="190" height="46" rx="13" fill="rgba(245,112,10,0.06)" stroke="rgba(245,112,10,0.22)" stroke-width="1"/>
                  <rect x="22" y="32" width="146" height="6" rx="3" fill="rgba(245,112,10,0.22)"/>
                  <rect x="22" y="45" width="106" height="6" rx="3" fill="rgba(245,112,10,0.14)"/>
                </g>
                <g class="hero-bubble">
                  <rect x="170" y="72" width="144" height="40" rx="13" fill="rgba(27,95,217,0.07)" stroke="rgba(27,95,217,0.20)" stroke-width="1"/>
                  <rect x="186" y="85" width="100" height="6" rx="3" fill="rgba(27,95,217,0.20)"/>
                  <rect x="186" y="97" width="68" height="6" rx="3" fill="rgba(27,95,217,0.13)"/>
                </g>
              </g>

              <!-- 共創 -->
              <g class="hero-flow-arrow">
                <line x1="110" y1="120" x2="110" y2="134" stroke="rgba(245,112,10,0.5)" stroke-width="1.2" stroke-dasharray="3 3"/>
                <path d="M106,134 L114,134 L110,141 Z" fill="rgba(245,112,10,0.6)"/>
                <text x="122" y="136" font-family="'IBM Plex Mono',monospace" font-size="7.5" font-weight="600" fill="#f5700a" letter-spacing="0.12em">CO-CREATION</text>
              </g>

              <!-- できること -->
              <text x="8" y="162" font-family="'IBM Plex Mono',monospace" font-size="8" font-weight="500" fill="rgba(27,95,217,0.42)" letter-spacing="0.14em" class="hero-outputs-label">WHAT WE CAN DO</text>
              <g class="hero-outputs">
                <g class="hero-out">
                  <rect x="6" y="172" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="20" y="186" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <rect x="26" y="193" width="14" height="12" rx="2" stroke="#1b5fd9" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/><line x1="26" y1="196.4" x2="40" y2="196.4" stroke="#1b5fd9" stroke-width="1.2" opacity="0.75"/><rect x="27.4" y="198" width="3.4" height="5.4" rx="0.8" fill="#1b5fd9" opacity="0.35"/><rect x="32" y="198" width="6" height="1.3" rx="0.65" fill="#1b5fd9" opacity="0.5"/><rect x="32" y="200.4" width="6" height="1.3" rx="0.65" fill="#1b5fd9" opacity="0.35"/><rect x="32" y="202.5" width="3.6" height="1.8" rx="0.9" fill="#f5700a" opacity="0.8"/>
                  <text x="56" y="197" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">Webサービス</text>
                  <text x="56" y="211" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">WEB APP</text>
                </g>
                <g class="hero-out">
                  <rect x="196" y="172" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="210" y="186" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <rect x="217" y="192" width="12" height="14" rx="1.8" stroke="#1b5fd9" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/><rect x="219.4" y="194.4" width="7.2" height="3.6" rx="0.8" fill="#f5700a" opacity="0.7"/><rect x="219.4" y="199.4" width="7.2" height="1.3" rx="0.65" fill="#1b5fd9" opacity="0.5"/><rect x="219.4" y="202.1" width="4.6" height="1.3" rx="0.65" fill="#1b5fd9" opacity="0.35"/>
                  <text x="246" y="197" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">ホームページ</text>
                  <text x="246" y="211" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">WEBSITE</text>
                </g>
                <g class="hero-out">
                  <rect x="6" y="234" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="20" y="248" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <rect x="28" y="254" width="10" height="14" rx="2.2" stroke="#1b5fd9" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/><rect x="29.8" y="256.6" width="6.4" height="4.6" rx="1.6" fill="#f5700a" opacity="0.75"/><rect x="29.8" y="262.2" width="4.4" height="1.2" rx="0.6" fill="#1b5fd9" opacity="0.4"/><line x1="31.2" y1="265.8" x2="34.8" y2="265.8" stroke="#1b5fd9" stroke-width="1.2" stroke-linecap="round" opacity="0.6"/>
                  <text x="56" y="259" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">LINEアプリ</text>
                  <text x="56" y="273" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">LIFF</text>
                </g>
                <g class="hero-out">
                  <rect x="196" y="234" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="210" y="248" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <line x1="217.5" y1="257.5" x2="223.5" y2="262.5" stroke="#1b5fd9" stroke-width="1" opacity="0.45" stroke-linecap="round"/><line x1="228" y1="256.5" x2="223.5" y2="262.5" stroke="#1b5fd9" stroke-width="1" opacity="0.45" stroke-linecap="round"/><line x1="228.5" y1="266" x2="223.5" y2="262.5" stroke="#1b5fd9" stroke-width="1" opacity="0.45" stroke-linecap="round"/><circle cx="223.5" cy="262.5" r="2.8" fill="#1b5fd9" opacity="0.75"/><circle cx="217.5" cy="257.5" r="2.2" fill="#f5700a" opacity="0.85"/><circle cx="228" cy="256.5" r="1.8" fill="#1b5fd9" opacity="0.55"/><circle cx="228.5" cy="266" r="1.8" fill="#1b5fd9" opacity="0.45"/>
                  <text x="246" y="259" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">データ分析・可視化</text>
                  <text x="246" y="273" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">DATA VIZ</text>
                </g>
                <g class="hero-out">
                  <rect x="6" y="296" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="20" y="310" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <circle cx="29.8" cy="323" r="4.7" stroke="#1b5fd9" stroke-width="1.2" fill="none" opacity="0.7"/><circle cx="36.2" cy="323" r="4.7" stroke="#f5700a" stroke-width="1.2" fill="none" opacity="0.85"/>
                  <text x="56" y="321" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">Google・LINE連携</text>
                  <text x="56" y="335" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">INTEGRATION</text>
                </g>
                <g class="hero-out">
                  <rect x="196" y="296" width="178" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="210" y="310" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <circle cx="223" cy="321.4" r="4.6" stroke="#1b5fd9" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/><line x1="223" y1="321.4" x2="223" y2="325.6" stroke="#1b5fd9" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/><rect x="220.9" y="326.2" width="4.2" height="1.5" rx="0.75" fill="#f5700a" opacity="0.85"/><rect x="221.5" y="328.4" width="3" height="1.3" rx="0.65" fill="#1b5fd9" opacity="0.45"/>
                  <text x="246" y="321" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">ITコンサル</text>
                  <text x="246" y="335" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">CONSULTING</text>
                </g>
                <g class="hero-out">
                  <rect x="6" y="358" width="368" height="54" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                  <rect x="20" y="372" width="26" height="26" rx="7" fill="rgba(27,95,217,0.07)"/>
                  <rect x="27" y="375" width="12" height="20" rx="2.4" stroke="#1b5fd9" stroke-width="1.2" fill="none" stroke-linejoin="round" stroke-linecap="round" opacity="0.75"/><rect x="29" y="378" width="8" height="12.5" rx="1" fill="#f5700a" opacity="0.7"/><circle cx="33" cy="392.3" r="1.1" fill="#1b5fd9" opacity="0.55"/>
                  <text x="56" y="383" font-family="'Noto Sans JP',sans-serif" font-size="11.5" font-weight="700" fill="#1a2136">スマホアプリ</text>
                  <text x="56" y="397" font-family="'IBM Plex Mono',monospace" font-size="7" font-weight="500" fill="rgba(27,95,217,0.45)" letter-spacing="0.12em">iOS / ANDROID</text>
                </g>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- こんなお悩み -->
    <section id="for-you">
      <div class="ac-wrap">
        <p class="section-label">For You</p>
        <h2 class="section-title">こんなお悩みは、ありませんか</h2>
        <ul class="for-you-list">
          <li>
            <span class="check">✓</span>
            業者に相談したら専門用語ばかりで、話が通じなかった。
          </li>
          <li>
            <span class="check">✓</span>
            ITは分からないけれど、今のやり方が非効率なのは分かっている。
          </li>
          <li>
            <span class="check">✓</span>
            規模が小さすぎて、どこも引き受けてくれない気がする。
          </li>
          <li>
            <span class="check">✓</span>
            記録やデータは溜まっているのに、使えていない。
          </li>
          <li>
            <span class="check">✓</span>
            既製のサービスだと、うちのやり方には合わない。
          </li>
          <li>
            <span class="check">✓</span>
            そもそも、何から相談すればいいのか分からない。
          </li>
        </ul>
        <p class="for-you-note">
          ひとつでも当てはまれば、それで十分です。<br />
          要件が決まっていなくて大丈夫。むしろその段階から声をかけてください。<br />
          これまで行政・観光・農業・医療など、業種を問わずご一緒してきました。
        </p>
      </div>
    </section>

    <!-- できること -->
    <section id="services">
      <div class="ac-wrap">
        <p class="section-label">Services</p>
        <h2 class="section-title">できること</h2>
        <p class="section-body">
          あなたが「実現したいこと」をじっくり伺って、触れる形にして、一緒に育てていきます。
        </p>
        <div class="service-grid">

          <div class="service-card">
            <div class="service-icon">🎧</div>
            <h3 class="service-card-title">まず、じっくり聞く</h3>
            <div class="service-card-body">
              <p>
                何を作るかより先に、会って話を聞きます。大事にしているのは「なぜそれを実現したいのか」。そこが分かると、作るべきものは自然に決まります。
              </p>
              <p>
                現場ごとの例外や、長年のやり方のクセ。既製のサービスが拾いきれないのは、たいていそこです。専門用語は使いませんので、普段の言葉のままお話しください。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">⚡</div>
            <h3 class="service-card-title">数日で、触れるものにする</h3>
            <div class="service-card-body">
              <p>
                伺った話を、その場で、あるいは1〜2日で「動くもの」にしてお見せします。文章で仕様を確認し合うより、触ってもらったほうが早いからです。
              </p>
              <p>
                AIに任せられるところは任せています。そのぶんの時間を、あなたの話を聞くことに使えるからです。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">🤝</div>
            <h3 class="service-card-title">触りながら、一緒に育てる</h3>
            <div class="service-card-body">
              <p>
                「ここは違う」「これも欲しい」を受けて、何度でも作り直します。壊される前提で作っているので、遠慮はいりません。
              </p>
              <p>
                一番良いものが生まれるのは、たいていこのやりとりの途中です。私が正解を出すのではなく、あなたの中にある答えが形になっていく時間だと思っています。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">🛠️</div>
            <h3 class="service-card-title">見た目から中身まで、ひとりで通せる</h3>
            <div class="service-card-body">
              <p>
                画面のデザインから、裏側の仕組み、データの保管、外部サービスとの連携まで、ひとりで担当します。窓口がひとつで済むので、話が伝わらないもどかしさがありません。
              </p>
              <p>
                データの集計・グラフ化や、AIを使った機能も、この中の一部として対応します。
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>

    <!-- 3つの道 -->
    <section id="scope" class="ac-scope">
      <div class="ac-wrap">
        <p class="section-label">Scope</p>
        <h2 class="section-title">できあがった後の、3つの道</h2>
        <p class="section-body">
          規模によって、私がどこまで担当するかは変わります。どれになるかは、お話を伺ってから一緒に決めます。
        </p>

        <div class="exit-grid">

          <div class="exit-card">
            <span class="exit-num">01</span>
            <h3 class="exit-title">小さくつくって、使い続ける</h3>
            <p class="exit-body">
              規模が大きくなければ、開発から実際の運用まで、そのまま私が担当します。作って終わりにせず、使いながら直していけるのが一番良い形だと思っています。
            </p>
          </div>

          <div class="exit-card">
            <span class="exit-num">02</span>
            <h3 class="exit-title">設計図まで描いて、渡す</h3>
            <p class="exit-body">
              大きな仕組みが必要なときは、私が企画書・設計書まで作り、専門のエンジニアへスムーズに橋渡しします。何を作るかが固まった状態で渡せるので、その後の話が早く進みます。
            </p>
          </div>

          <div class="exit-card exit-card-accent">
            <span class="exit-num">03</span>
            <h3 class="exit-title">つくらない、という提案</h3>
            <p class="exit-body">
              すでにあるサービスの紹介や、その組み合わせで解決するなら、それが一番安く済みます。作らないほうが良いと思ったときは、正直にそう言います。
            </p>
          </div>

        </div>

        <p class="exit-note">
          どこまでご一緒するかは、規模とご予算に合わせてその都度決めていきます。<br />
          「これは頼めるだろうか」という段階のご相談で構いません。
        </p>
      </div>
    </section>

    <!-- 進め方 -->
    <section id="process" class="ac-process">
      <div class="ac-wrap">
        <p class="section-label">Process</p>
        <h2 class="section-title">進め方</h2>
        <p class="section-body">
          企画書を書いてから作るのではなく、伺った話をそのまま動くものにして、それを叩き台に一緒に考えていきます。
        </p>

        <ol class="process-list">
          <li class="process-item">
            <span class="process-num">01</span>
            <div class="process-body">
              <strong>お話を聞く<em>30分〜 / オンライン可</em></strong>
              相談することと、お願いすることは別です。まずは「こんなことできますか」を聞かせてください。そのまま、お困りごとや現場のやり方、「本当はこうしたい」までじっくり伺うこともできます。要件が決まっていなくて大丈夫です。むしろその段階から声をかけてください。この段階で終わっても、まったく構いません。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">02</span>
            <div class="process-body">
              <strong>すぐ作る<em>その場〜1〜2日</em></strong>
              伺った話を、そのまま動くものにします。待たされている間に熱が冷めてしまわないよう、とにかく早くお見せすることを大事にしています。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">03</span>
            <div class="process-body">
              <strong>触って、直す<em>何度でも</em></strong>
              「ここは違う」「これも欲しい」を受けて作り直します。ここが一番価値の出るところなので、遠慮なく壊してください。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">04</span>
            <div class="process-body">
              <strong>その先を、一緒に決める</strong>
              形が見えてきたところで、このまま運用まで進めるか、設計図にして専門チームへ渡すか、既存のサービスで足りるかを一緒に判断します。
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- 実績 -->
    <section id="portfolio" class="ac-portfolio">
      <div class="ac-wrap">
        <p class="section-label">Works</p>
        <h2 class="section-title">実績</h2>
        <p class="section-body" style="margin-bottom: 0;">
          「どなたの、どんな困りごとを、どう解決したか」で並べています。
        </p>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              公開・稼働中
            </span>
            <h3 class="portfolio-card-title">宮古島市議会 議事録の可視化</h3>
            <dl class="work-ba">
              <div>
                <dt>どなたの</dt>
                <dd>市政に関心のある市民、そして自治体の方</dd>
              </div>
              <div>
                <dt>困っていたこと</dt>
                <dd>議事録は公開されているのに、PDFのままで読みにくく、誰も活用できていなかった</dd>
              </div>
              <div>
                <dt>したこと</dt>
                <dd>文章を単語に分解し、つながりの図とヒートマップにしました。年ごと・議員ごとなど、いくつもの切り口から議論の流れが見えるようになっています</dd>
              </div>
              <div>
                <dt>いま</dt>
                <dd>公開・稼働中。どなたでも触っていただけます</dd>
              </div>
            </dl>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-features">
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>つながりの図で、議論の全体像を見る</strong>
                  どの言葉とどの言葉が一緒に語られているかを図にしました。何がどう結びついているかを、読まずに掴むことができます。
                  <br>
                  <a href="https://prototype.insightlens.jp/miyako/network" class="feature-link" target="_blank">
                    ネットワーク図を見る
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  <img src="/images/miyako-network.png" alt="ネットワーク図のスクリーンショット" class="feature-screenshot" @click="openLightbox('/images/miyako-network.png', 'ネットワーク図のスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>その年らしい話題が浮かび上がる</strong>
                  年ごと・会期ごとに、どんなテーマが特徴的だったかを色の濃さで表しました。時代とともに移り変わる関心が一目で分かります。
                  <br>
                  <a href="https://prototype.insightlens.jp/miyako/yearly" class="feature-link" target="_blank">
                    年別ヒートマップを見る
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  <img src="/images/miyako-yearly.png" alt="年別ヒートマップのスクリーンショット" class="feature-screenshot" @click="openLightbox('/images/miyako-yearly.png', '年別ヒートマップのスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>議員ごとの関心が比べられる</strong>
                  どの議員が、どんな分野の話を多くしているかを一覧にしました。それぞれの関心領域や特色を並べて見ることができます。
                  <br>
                  <a href="https://prototype.insightlens.jp/miyako/member" class="feature-link" target="_blank">
                    議員別ヒートマップを見る
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  <img src="/images/miyako-member.png" alt="議員別ヒートマップのスクリーンショット" class="feature-screenshot" @click="openLightbox('/images/miyako-member.png', '議員別ヒートマップのスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>気になる言葉から、流れを追える</strong>
                  言葉をひとつ入れると、それが語られた会議をAIが時系列でまとめます。いつ何が話され、どう決まっていったかを追いかけられます。
                  <br>
                  <a href="https://prototype.insightlens.jp/miyako/keyword" class="feature-link" target="_blank">
                    キーワード分析を見る
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </a>
                  <img src="/images/miyako-keyword.png" alt="キーワード分析のスクリーンショット" class="feature-screenshot" @click="openLightbox('/images/miyako-keyword.png', 'キーワード分析のスクリーンショット')" />
                </div>
              </div>
            </div>

            <div class="portfolio-tech">
              <span class="tech-badge">Nuxt</span>
              <span class="tech-badge">ECharts</span>
              <span class="tech-badge">OpenAI API</span>
              <span class="tech-badge">Vector Store / File Search</span>
              <span class="tech-badge">Cloudflare Workers</span>
              <span class="tech-badge">Cloudflare D1</span>
              <span class="tech-badge">TF-IDF</span>
              <span class="tech-badge">形態素解析</span>
              <span class="tech-badge">TypeScript</span>
            </div>

            <a href="https://prototype.insightlens.jp/miyako" class="portfolio-link" target="_blank">
              実際に触ってみる
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              公開・稼働中
            </span>
            <h3 class="portfolio-card-title">晴レルヤ鍼灸院 ホームページ制作</h3>
            <dl class="work-ba">
              <div>
                <dt>どなたの</dt>
                <dd>新しく開業された「晴レルヤ鍼灸院」の先生</dd>
              </div>
              <div>
                <dt>困っていたこと</dt>
                <dd>開業にあたって、ホームページがなかった</dd>
              </div>
              <div>
                <dt>したこと</dt>
                <dd>院の特徴を伝えるホームページを制作しました</dd>
              </div>
              <div>
                <dt>いま</dt>
                <dd>公開・稼働中</dd>
              </div>
            </dl>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-features">
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>院の特徴が、開いてすぐ伝わるトップページ</strong>
                  「内臓鍼灸×ソフトカイロ矯正」という2つの強みを、施術の写真とあわせて最初の画面で伝えます。LINEでの予約・お問い合わせと、Instagramへの導線もここから。
                  <img src="/images/hareruya-top.png" alt="晴レルヤ鍼灸院トップページのスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-top.png', '晴レルヤ鍼灸院トップページのスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>3つの特徴を、施術風景とともに紹介</strong>
                  「内臓鍼灸」がどんな施術かを、実際の施術風景と文章でひとつずつ説明。初めての方が抱く不安に、先回りして答える構成にしました。
                  <img src="/images/hareruya-features.png" alt="晴レルヤ鍼灸院の3つの特徴のスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-features.png', '晴レルヤ鍼灸院の3つの特徴のスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>写真をめくって辿り着ける、道案内</strong>
                  ビルの一室にあり地図だけでは分かりにくいため、「エレベーターで一階に降りてください」のように、曲がり角ごとの実写真をめくって進める道案内をつくりました。初めての方の「迷ったらどうしよう」を減らします。
                  <img src="/images/hareruya-access.png" alt="晴レルヤ鍼灸院のアクセス案内のスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-access.png', '晴レルヤ鍼灸院のアクセス案内のスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>ほかにも、AIによる質問回答なども組み込めます</strong>
                  本サイトでは導入していませんが、たとえば鍼灸についてのご質問に対して、あらかじめ用意した院の情報をもとにAIが回答する仕組みも組み込めます。このほかにも、ホームページにはさまざまな機能を追加していくことが可能です。
                </div>
              </div>
            </div>

            <div class="portfolio-tech">
              <span class="tech-badge">Nuxt</span>
              <span class="tech-badge">Cloudflare Workers</span>
            </div>

            <a href="https://hareruya.insightlens.jp/" class="portfolio-link" target="_blank" rel="noopener noreferrer">
              サイトを見る
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              公開・稼働中
            </span>
            <h3 class="portfolio-card-title">晴レルヤ鍼灸院 LINE予約システム</h3>
            <dl class="work-ba">
              <div>
                <dt>どなたの</dt>
                <dd>同じく「晴レルヤ鍼灸院」の先生</dd>
              </div>
              <div>
                <dt>困っていたこと</dt>
                <dd>患者さんが自分で予約できる仕組みがなかった</dd>
              </div>
              <div>
                <dt>したこと</dt>
                <dd>LINEから予約が完結する仕組みを一から構築しました。患者さんはカレンダーから予約でき、管理者は枠の管理から確認・返信までLINE上で完結できます</dd>
              </div>
              <div>
                <dt>いま</dt>
                <dd>公開・稼働中</dd>
              </div>
            </dl>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-features">
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>患者さん側：カレンダーから、迷わず予約</strong>
                  LINEのトーク画面からそのままカレンダーが開きます。緑は予約可能な日、茶色は「相談すれば対応できるかもしれない日」。空いている日だけに絞らず、相談の余地も見える形にしています。
                  <img src="/images/hareruya-booking-calendar.jpg" alt="LINE予約カレンダーのスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-booking-calendar.jpg', 'LINE予約カレンダーのスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>予約が入ったら、確認してから返信</strong>
                  予約が入ると内容が届き、院の先生が内容を確認したうえで返信を送信します。送るメッセージはその場で編集できるので、一言添えることもできます。
                  <img src="/images/hareruya-booking-confirm.jpg" alt="予約確認・送信画面のスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-booking-confirm.jpg', '予約確認・送信画面のスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>管理者側：1日ごと、1時間ごとに枠を調整</strong>
                  日ごとに「予約可・予約不可・相談のみ」を設定でき、時間帯も1時間単位で選べます。すでに予約が入っている時間は解除できないようになっているので、誤って上書きする心配もありません。
                  <img src="/images/hareruya-booking-admin-slot.jpg" alt="管理者用の枠設定画面のスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-booking-admin-slot.jpg', '管理者用の枠設定画面のスクリーンショット')" />
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>曜日を指定して、一括登録</strong>
                  「月・木の10時から5枠」のように指定するだけで、その曜日の枠をまとめて登録できます。毎週同じ形で開いている日は、この一括登録で数秒で終わります。
                  <img src="/images/hareruya-booking-bulk.jpg" alt="枠の一括登録画面のスクリーンショット" class="feature-screenshot feature-screenshot-portrait" @click="openLightbox('/images/hareruya-booking-bulk.jpg', '枠の一括登録画面のスクリーンショット')" />
                </div>
              </div>
            </div>

            <div class="portfolio-tech">
              <span class="tech-badge">Nuxt</span>
              <span class="tech-badge">Cloudflare Workers</span>
              <span class="tech-badge">LINE連携</span>
              <span class="tech-badge">LIFF</span>
            </div>

            <p class="portfolio-card-note">
              LINEで予約が完結する仕組みは、既製のサービスだと月額5,000円以上かかることが多いのが実情です。今回は一から作っているので、かかるのは開発費用のみ。使っていない月の維持費はかかりません。枠の出し方や表示のルールも、院の運用に合わせて自由に調整できます。
            </p>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              稼働中
            </span>
            <h3 class="portfolio-card-title">ゲストハウスの、観光インサイトツール</h3>
            <dl class="work-ba">
              <div>
                <dt>どなたの</dt>
                <dd>ゲストハウスの運営者、そして地域の観光事業者の方</dd>
              </div>
              <div>
                <dt>困っていたこと</dt>
                <dd>観光客のレビューや対話の記録が溜まる一方で、活かしきれていなかった</dd>
              </div>
              <div>
                <dt>したこと</dt>
                <dd>溜まったデータを分析し、観光業を盛り上げるための気づきを取り出せる道具をつくりました</dd>
              </div>
              <div>
                <dt>いま</dt>
                <dd>稼働中（共同制作）</dd>
              </div>
            </dl>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-trial">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 9.5V3"/></svg>
              実証実験中
            </span>
            <h3 class="portfolio-card-title">農家のみなさんの、議事録づくりとその後の段取り</h3>
            <dl class="work-ba">
              <div>
                <dt>どなたの</dt>
                <dd>和歌山県の町で活動する、農家のみなさん</dd>
              </div>
              <div>
                <dt>困っていたこと</dt>
                <dd>会議の音声が録りっぱなしで、記録として眠るだけになっていた</dd>
              </div>
              <div>
                <dt>したこと</dt>
                <dd>音声から議事録を自動でつくり、そこから「やるべきこと」と日程を取り出して、普段お使いのGoogleのドキュメント・タスク・カレンダーへ自動で登録されるようにしました</dd>
              </div>
              <div>
                <dt>いま</dt>
                <dd>実証実験として、無償で進めています</dd>
              </div>
            </dl>
          </div>
        </div>

        <p class="works-other">
          このほかに、音声の日記から気持ちの動きを見えるようにするツールなども、自分用に作って試しています。
        </p>
      </div>
    </section>

    <!-- 私について -->
    <section id="about" class="ac-about">
      <div class="ac-wrap">
        <p class="section-label">About</p>
        <h2 class="section-title">私について</h2>

        <!-- 原点 -->
        <div class="origin">
          <span class="origin-label">原点</span>
          <p class="origin-lead">このやり方の原点は、たった一言でした。</p>

          <blockquote class="origin-quote">
            <p>「Excelの表は見にくいから、ネットワーク図にしてはどうか」</p>
            <cite>会社員時代、社内でツールを使ってくれていた一人の言葉</cite>
          </blockquote>

          <ol class="origin-steps">
            <li><span class="origin-step-num">1</span>その一言を、そのままプロトタイプにしてみた</li>
            <li><span class="origin-step-num">2</span>思いがけず大きな反響があった</li>
            <li><span class="origin-step-num">3</span>いまは、社外向けサービスの主力ツールになっている</li>
          </ol>

          <p class="origin-close">
            思いついたのは、私ではありません。<strong>毎日それを使っている人が、すでに答えを持っていた。</strong><br />
            それ以来、「なぜそれを実現したいのか」というお客さん自身の声を何より大切に伺い、
            それを見える形に変えることを、仕事の出発点にしています。
          </p>
        </div>

        <p class="about-intro">
          15年以上、データを「誰かの意思決定を動かす形」に変えることを仕事にしてきました。
        </p>

        <div class="about-grid">

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">🎧</span>
              <h3 class="about-card-title">要件が固まる前の段階に飛び込む</h3>
            </div>
            <div class="about-card-body">
              <p>得意なのは、まだ何も決まっていない段階に飛び込み、現場の声を丁寧に聞きながら、その場でプロトタイプを作ってしまうことです。</p>
              <p>聞くことと作ることを分けない。話しながら手を動かすので、「言ったことと違うものが出てくる」というズレが起きにくいのが強みです。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">⚡</span>
              <h3 class="about-card-title">プロトタイプが企画書</h3>
            </div>
            <div class="about-card-body">
              <p>仕様書や企画書を先に作るのではなく、動くものを先に作り、それを叩き台にして話を前に進めます。</p>
              <p>何十時間も結論が出なかった会議に、動くプロトタイプを持ち込んで「これで決まり」となった経験が何度もあります。言葉を重ねるより、そのほうが速い。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">💬</span>
              <h3 class="about-card-title">聞くことを、別の仕事にもしている</h3>
            </div>
            <div class="about-card-body">
              <p>心理カウンセラーとしても活動しています。人の話を、遮らずに、判断せずに聞く訓練を積んできました。</p>
              <p>ITが苦手な方が「こんなことを言ったら笑われるかもしれない」と思わずに済む場をつくること。それが、良いものが生まれるための最初の条件だと思っています。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">📈</span>
              <h3 class="about-card-title">これまでの仕事</h3>
            </div>
            <div class="about-card-body">
              <p>大手インターネット企業に15年勤務し、大規模なデータを扱う分析サービスの企画・開発に従事しました。性別・年齢・地域といった切り口に応じて、ネットワーク図・散布図・ヒートマップなど、目的に合った見せ方を設計してきました。</p>
              <p>自分のプロトタイプから生まれた機能が、そのまま製品の主力に育っていく過程を、何度か経験しています。</p>
            </div>
          </div>

        </div>

        <div class="about-belief">
          <span class="about-belief-label">大切にしていること</span>
          <p>まだ誰も見えていないものを、形にして、人の「できる」を増やすこと。</p>
          <p class="about-belief-sub">
            「これは無理だ」「意味がない」と言われたところから、プロトタイプで可能性を示し、対話しながら実用に育てていく。<br />
            そのプロセスそのものに、一番のやりがいを感じています。
          </p>
        </div>

        <div class="about-profile">
          2002年：桐蔭学園理数科卒<br>
          2006年：慶応義塾大学情報工学科卒業。<br>
          趣味は格闘技や野球観戦、子どもと始めた剣道、ベランダ農業など。<br>
          他に心理カウンセラーとして活動中。
        </div>
      </div>
    </section>

    <!-- ご相談と費用 -->
    <section id="terms">
      <div class="ac-wrap">
        <p class="section-label">Fees</p>
        <h2 class="section-title">ご相談と費用</h2>
        <p class="terms-intro">ご相談の前に、知っておいていただきたいことをまとめています。</p>
        <div class="terms-grid">

          <div class="terms-card">
            <div class="terms-icon">🌱</div>
            <h3 class="terms-card-title">まず、小さく始めます</h3>
            <p class="terms-card-body">いきなり大きく作りません。最初は必ず、触れるプロトタイプから。<br />そこから育てるか、設計図にして渡すか、作らずに済ませるかを、一緒に決めます。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">📦</div>
            <h3 class="terms-card-title">お渡しするもの</h3>
            <p class="terms-card-body">進む道によって変わります。<br />運用まで担当する場合は、実際に使えるWebアプリ・スマホアプリと、その後の運用。設計図まで担当する場合は、企画書・設計書一式をお渡しします。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔄</div>
            <h3 class="terms-card-title">修正対応・開発の範囲</h3>
            <p class="terms-card-body">開発は、ご相談時に合意した内容を対象とします。合意を大きく超える変更・追加は、別途お見積もりになります。<br />方向性の調整はいつでも歓迎です。それがこのやり方の目的でもあります。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔐</div>
            <h3 class="terms-card-title">著作権</h3>
            <p class="terms-card-body">納品物の著作権は、お客様に完全に譲渡します。<br />ただし制作者は、制作実績として画面・URLを掲載する権利を留保します。掲載を希望されない場合は、遠慮なくお申し付けください。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">💻</div>
            <h3 class="terms-card-title">動作環境</h3>
            <p class="terms-card-body">プロトタイプの段階では、パソコンのChrome最新版を対象とします。<br />そのまま運用まで進む場合は、スマートフォンを含めて対象とする環境をご相談のうえ決めます。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🛠️</div>
            <h3 class="terms-card-title">使っている技術</h3>
            <p class="terms-card-body">Nuxt / TypeScript / Cloudflare Workers・D1 / ECharts・Highcharts（データの可視化）/ OpenAI API・Claude API（AI機能）/ LINE連携 などを中心に使用。<br />案件の内容に応じて最適なものを選びます。</p>
          </div>

        </div>

        <div class="terms-payment">
          <div class="terms-payment-header">
            <span class="terms-payment-icon">💳</span>
            <h3 class="terms-payment-title">費用</h3>
          </div>
          <div class="terms-payment-body">
            <div class="terms-payment-row">
              <span class="terms-payment-label">ご相談</span>
              <span class="terms-payment-value">¥5,000 / 時間</span>
            </div>
            <div class="terms-payment-row">
              <span class="terms-payment-label">開発費用</span>
              <span class="terms-payment-value">規模・内容によるため、ヒアリング後にお見積もり</span>
            </div>
            <div class="terms-payment-row">
              <span class="terms-payment-label">運用・保守</span>
              <span class="terms-payment-value">続けて担当する場合は、月額でご相談</span>
            </div>
            <div class="terms-payment-row">
              <span class="terms-payment-label">着手金</span>
              <span class="terms-payment-value">開発費用の 50%（着手前）、残金は納品時</span>
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- CTA -->
    <section id="contact" class="ac-cta">
      <div class="ac-wrap">
        <div class="cta-inner">
          <h2 class="cta-title">「こういうの、できませんか」から始まります。</h2>
          <p class="cta-desc">
            そのくらいの温度感で十分です。まだ何も決まっていない段階で構いません。<br />
            ITの言葉が出てこなくても、まったく問題ありません。一緒に考えます。
          </p>
          <div class="cta-price">
            <span class="cta-price-label">初回相談</span>
            <span class="cta-price-value">60分 / ¥5,000</span>
          </div>
          <div class="cta-buttons">
            <a href="https://docs.google.com/forms/d/e/1FAIpQLSdBsT7TiFTC_zl8B7saQxM60-WcjHTpv7pz-ere34aQ_1YWsw/viewform?usp=publish-editor" class="btn-primary" target="_blank" rel="noopener noreferrer">
              お問い合わせ
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="ac-footer">
      <div class="ac-footer-inner">
        <span class="ac-footer-copy">&copy; 2026 prototyper</span>
        <a href="https://prototype.insightlens.jp/miyako" class="ac-footer-link">実績: 宮古島市議会 議事録の可視化 →</a>
      </div>
    </footer>

    <!-- ライトボックス -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="lightbox-overlay" @click="closeLightbox">
        <button class="lightbox-close" @click="closeLightbox">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
        <img :src="lightbox.src" :alt="lightbox.alt" class="lightbox-img" @click.stop />
      </div>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'prototyper' })

const lightbox = reactive({ open: false, src: '', alt: '' })

function openLightbox(src: string, alt: string) {
  lightbox.src = src
  lightbox.alt = alt
  lightbox.open = true
}

function closeLightbox() {
  lightbox.open = false
}

onMounted(() => {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLightbox() })
})

useHead({
  title: 'prototyper | 答えは、いつもあなたの中にある。',
  meta: [
    { name: 'description', content: 'ものづくりの主役は、つくる人ではなくあなた自身。実現したいことをじっくり伺い、触れるプロトタイプにして一緒に育てます。ITが苦手な方でも大丈夫。規模に応じて、運用まで担当することも、設計図にして専門チームへ渡すこともできます。' },
    { property: 'og:title', content: 'prototyper | 答えは、いつもあなたの中にある。' },
    { property: 'og:description', content: 'あなたの中にすでにある答えを、触れる形にして一緒に育てる。ITが苦手な方でも安心して話せる、ヒアリングとプロトタイピングの相談窓口です。' },
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤝</text></svg>` }],
})
</script>

<style>
@import '~/assets/css/prototyper.css';
</style>
