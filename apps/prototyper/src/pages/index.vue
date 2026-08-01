<template>
  <div class="ac-page">

    <!-- ナビゲーション -->
    <nav class="ac-nav">
      <div class="ac-nav-inner">
        <span class="ac-nav-logo">prototyper</span>
        <ul class="ac-nav-links">
          <li><a href="#services">できること</a></li>
          <li><a href="#process">進め方</a></li>
          <li><a href="#portfolio">制作事例</a></li>
          <li><a href="#about">自己紹介</a></li>
          <li><a href="#terms">ご依頼について</a></li>
          <li><a href="#contact">お問い合わせ</a></li>
        </ul>
      </div>
    </nav>

    <!-- ヒーロー -->
    <section class="ac-hero">
      <div class="ac-wrap">
        <div class="hero-inner">
          <div class="hero-text">
            <span class="hero-eyebrow">Interview &rarr; Working Prototype</span>
            <h1 class="hero-catch">
              動くものを、<br />
              <span>いちばん早く。</span>
            </h1>
            <div class="hero-sub">
              <p>「こういうのが欲しいかも」——その、もやっとした段階から話を聞きに行きます。</p>
              <p>
                大事にしているのは、表面的な要望の奥にある「本当は何に困っているか」を掴むこと。<br />
                そこを掴んだら、仕様書ではなく<strong>動くプロトタイプ</strong>にして持っていきます。議論より、触れるもの。
              </p>
              <p>
                実装はAIとのバイブコーディングが軸なので、とにかく速い。<br />
                だからこそ、既製のアプリでは手の届かない「うちのやり方だとここが違う」という細かいところまで、作り込むことができます。
              </p>
            </div>
            <a href="#contact" class="hero-cta">
              まずは相談する
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div class="hero-viz-deco" aria-hidden="true">
            <svg viewBox="0 0 380 272" fill="none" xmlns="http://www.w3.org/2000/svg" class="hero-flow-svg">
              <!-- ヒアリング（会話） -->
              <text x="8" y="10" font-family="'IBM Plex Mono',monospace" font-size="8" font-weight="500" fill="rgba(27,95,217,0.42)" letter-spacing="0.14em">HEARING</text>
              <g class="hero-bubbles">
                <g class="hero-bubble">
                  <rect x="6" y="18" width="198" height="54" rx="13" fill="rgba(245,112,10,0.06)" stroke="rgba(245,112,10,0.22)" stroke-width="1"/>
                  <rect x="22" y="33" width="152" height="6" rx="3" fill="rgba(245,112,10,0.22)"/>
                  <rect x="22" y="47" width="112" height="6" rx="3" fill="rgba(245,112,10,0.14)"/>
                </g>
                <g class="hero-bubble">
                  <rect x="146" y="82" width="166" height="46" rx="13" fill="rgba(27,95,217,0.07)" stroke="rgba(27,95,217,0.20)" stroke-width="1"/>
                  <rect x="162" y="96" width="118" height="6" rx="3" fill="rgba(27,95,217,0.20)"/>
                  <rect x="162" y="110" width="80" height="6" rx="3" fill="rgba(27,95,217,0.13)"/>
                </g>
              </g>

              <!-- 変換（バイブコーディング） -->
              <g class="hero-flow-arrow">
                <line x1="120" y1="134" x2="120" y2="148" stroke="rgba(245,112,10,0.5)" stroke-width="1.2" stroke-dasharray="3 3"/>
                <path d="M116,148 L124,148 L120,155 Z" fill="rgba(245,112,10,0.6)"/>
                <text x="132" y="150" font-family="'IBM Plex Mono',monospace" font-size="7.5" font-weight="600" fill="#f5700a" letter-spacing="0.12em">VIBE CODING</text>
              </g>

              <!-- 動くプロトタイプ -->
              <g class="hero-window">
                <rect x="28" y="158" width="324" height="102" rx="10" fill="#f0f4fb" stroke="rgba(27,95,217,0.24)" stroke-width="1.2"/>
                <line x1="28" y1="180" x2="352" y2="180" stroke="rgba(27,95,217,0.16)" stroke-width="1"/>
                <circle cx="42" cy="169" r="3" fill="rgba(245,112,10,0.45)"/>
                <circle cx="53" cy="169" r="3" fill="rgba(27,95,217,0.28)"/>
                <circle cx="64" cy="169" r="3" fill="rgba(27,95,217,0.16)"/>
                <rect x="80" y="163" width="130" height="12" rx="6" fill="rgba(27,95,217,0.06)"/>

                <g class="hero-window-body">
                  <!-- 可視化パーツ -->
                  <line x1="42" y1="248" x2="196" y2="248" stroke="rgba(27,95,217,0.15)" stroke-width="1"/>
                  <g class="hero-mini-bars">
                    <rect x="46" y="232" width="12" height="16" rx="2" fill="rgba(27,95,217,0.12)"/>
                    <rect x="66" y="222" width="12" height="26" rx="2" fill="rgba(27,95,217,0.14)"/>
                    <rect x="86" y="226" width="12" height="22" rx="2" fill="rgba(27,95,217,0.13)"/>
                    <rect x="106" y="214" width="12" height="34" rx="2" fill="rgba(27,95,217,0.16)"/>
                    <rect x="126" y="204" width="12" height="44" rx="2" fill="rgba(27,95,217,0.18)"/>
                    <rect x="146" y="210" width="12" height="38" rx="2" fill="rgba(27,95,217,0.17)"/>
                    <rect x="166" y="196" width="12" height="52" rx="2" fill="rgba(27,95,217,0.20)"/>
                  </g>
                  <polyline points="52,228 72,218 92,222 112,210 132,200 152,206 172,192" fill="none" stroke="#1b5fd9" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="hero-mini-line"/>
                  <circle cx="172" cy="192" r="3.5" fill="#f5700a" class="hero-mini-peak"/>

                  <!-- UIパーツ -->
                  <rect x="216" y="192" width="120" height="11" rx="3" fill="rgba(27,95,217,0.09)"/>
                  <rect x="216" y="211" width="120" height="11" rx="3" fill="rgba(27,95,217,0.07)"/>
                  <rect x="216" y="230" width="72" height="18" rx="9" fill="rgba(245,112,10,0.85)"/>
                </g>
              </g>
              <text x="28" y="270" font-family="'IBM Plex Mono',monospace" font-size="7.5" font-weight="500" fill="rgba(27,95,217,0.38)" letter-spacing="0.14em" class="hero-flow-caption">RUNNING IN DAYS</text>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- できること -->
    <section id="services">
      <div class="ac-wrap">
        <p class="section-label">Services</p>
        <h2 class="section-title">できること</h2>
        <p class="section-body">
          お客さんのニーズを丁寧に伺って、一般のアプリでは手の届かない「かゆいところ」まで届く道具を作ります。
        </p>
        <div class="service-grid">

          <div class="service-card">
            <div class="service-icon">🎧</div>
            <h3 class="service-card-title">丁寧なヒアリング</h3>
            <div class="service-card-body">
              <p>
                仕様よりも先に、人に会って話を聞く。表面的な要望の奥にある「本当は何に困っているか」を掴み、そこから逆算して作るものを決めます。
              </p>
              <p>
                現場ごとの例外処理や、運用のクセ。既製のサービスが拾いきれないのは、たいていそこです。聞き出して、そこを作り込みます。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">⚡</div>
            <h3 class="service-card-title">高速プロトタイピング</h3>
            <div class="service-card-body">
              <p>
                アイデアが浮かんだら、まず動くものを作る。壊される前提で作ることに抵抗がなく、フィードバックを受けて何度でも作り直します。
              </p>
              <p>
                何十時間も結論の出なかった会議に、動くプロトタイプを持ち込んで「これで決まり」となった経験が何度もあります。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">🤖</div>
            <h3 class="service-card-title">AIによる開発の高速化</h3>
            <div class="service-card-body">
              <p>
                バイブコーディングが開発の軸です。AIに実装や叩き台の生成を任せ、自分は全体設計・価値判断・軌道修正に集中する。
              </p>
              <p>
                AIが出したものの矛盾や粗を見つけ、対話しながら磨いて、また実行させる。優秀なパートナーに指示を出す感覚で進めるので、とにかく速い。
              </p>
            </div>
          </div>

          <div class="service-card">
            <div class="service-icon">🛠️</div>
            <h3 class="service-card-title">全体を見渡す設計と実装</h3>
            <div class="service-card-body">
              <p>
                フロントエンドからバックエンド、API設計、データベース、非同期処理まで一人で通せるので、「どこがボトルネックか」「どこを直せば価値が最大になるか」を自分で判断できます。
              </p>
              <p>
                データの集計・可視化やAI機能の実装も、この中の一部として対応します（形態素解析などの前処理から、ECharts・Highchartsによるインタラクティブな可視化まで）。
              </p>
            </div>
          </div>

        </div>
        <div class="services-scope">
          <div class="services-scope-item services-scope-in">
            <span class="scope-label">担当範囲</span>
            <span class="scope-text">ヒアリング / アイデアの検証 / プロトタイプ開発</span>
          </div>
          <div class="services-scope-item services-scope-out">
            <span class="scope-label">対象外</span>
            <span class="scope-text">本番運用・インフラ管理</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 進め方 -->
    <section id="process" class="ac-process">
      <div class="ac-wrap">
        <p class="section-label">Process</p>
        <h2 class="section-title">進め方</h2>
        <p class="section-body">
          企画書を書いてから作るのではなく、聞いた話をそのまま動くものにして、それを叩き台に議論を前へ進めます。
        </p>

        <ol class="process-list">
          <li class="process-item">
            <span class="process-num">01</span>
            <div class="process-body">
              <strong>聞く</strong>
              お困りごと、現場の運用、「本当はこうしたい」を伺います。要件が決まっていなくて大丈夫です。むしろその段階から声をかけてください。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">02</span>
            <div class="process-body">
              <strong>すぐ作る</strong>
              伺った話を、そのまま動くプロトタイプにします。文章で仕様を確認し合うより、触ってもらったほうが早いからです。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">03</span>
            <div class="process-body">
              <strong>触って、直す</strong>
              「ここは違う」「これも欲しい」を受けて作り直します。ここが一番価値の出るところなので、遠慮なく壊してください。
            </div>
          </li>
          <li class="process-item">
            <span class="process-num">04</span>
            <div class="process-body">
              <strong>お渡しする</strong>
              触って動くWebアプリとしてお渡しします。そのまま社内での提案や、次の判断の材料に使えます。
            </div>
          </li>
        </ol>
      </div>
    </section>

    <!-- ポートフォリオ -->
    <section id="portfolio" class="ac-portfolio">
      <div class="ac-wrap">
        <p class="section-label">Portfolio</p>
        <h2 class="section-title">制作事例</h2>
        <p class="section-body" style="margin-bottom: 0;">
          実際に作ってきたものをご紹介します。
        </p>

        <!-- TODO: スクリーンショットと機能詳細が揃い次第、portfolio-features / portfolio-tech を追加する -->
        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ご依頼いただいた事例
            </span>
            <h3 class="portfolio-card-title">鍼灸院向け LINE予約アプリ</h3>
            <p class="portfolio-card-lead">
              鍼灸院の先生からのご相談で開発した、LINEから予約が完結するアプリです。<br />
              既製の予約サービスでは合わなかった、その院ならではの受け付け方・運用に合わせて作りました。
            </p>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-note">
              スクリーンショットと機能の詳細は準備中です。近日公開します。
            </div>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              公開デモあり
            </span>
            <h3 class="portfolio-card-title">宮古島市議会議事録 分析ツール</h3>
            <p class="portfolio-card-lead">
              「議事録は公開されているのに、誰も読めていない」という素朴な疑問から作ったツールです。<br />
              公開されている宮古島市議会の議事録テキストを自然言語処理で分析し、キーワードの出現傾向をインタラクティブに可視化。AIによる議論要約も搭載しています。
            </p>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-features">
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>ネットワーク図で議論の全体像を把握</strong>
                  キーワードや議員・テーマ間のつながりをネットワーク図で可視化。どのトピックがどう結びついているかを、直感的に読み取ることができます。
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
                  <strong>年ごとの特徴的な話題ヒートマップ</strong>
                  TF-IDFスコアを使って、各年・各会期にどんなテーマが特徴的だったかをヒートマップで可視化。時代とともに移り変わる議会の関心を一目で読み取れます。
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
                  <strong>議員の発言傾向ヒートマップ</strong>
                  議員ごとに、どんな分野・カテゴリの発言が多いかをヒートマップで一覧表示。各議員の関心領域や特色をひと目で比較できます。
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
                  <strong>キーワードで引くAI時系列分析</strong>
                  キーワードを検索すると、関連する会議での発言をAIが時系列で要約・分析。議論のトピック・結論・流れを自動生成します。
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
              <span class="tech-badge">Nuxt 3</span>
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
              デモを見る
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag portfolio-tag-soft">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z"/></svg>
              プロトタイプから製品になった事例
            </span>
            <h3 class="portfolio-card-title">キーワードマップ（企業向けデータ可視化SaaS）</h3>
            <p class="portfolio-card-lead">
              大手インターネット企業で、検索データを可視化する企業向けSaaSの主力機能「キーワードマップ」を、自らのプロトタイピングから考案・実装しました。
            </p>
          </div>
          <div class="portfolio-card-body">
            <div class="portfolio-metrics">
              <div class="portfolio-metric">
                <span class="metric-value">500社+</span>
                <span class="metric-label">導入企業</span>
              </div>
              <div class="portfolio-metric">
                <span class="metric-value">8億規模</span>
                <span class="metric-label">プロダクト売上</span>
              </div>
              <div class="portfolio-metric">
                <span class="metric-value">15年</span>
                <span class="metric-label">データ可視化の経験</span>
              </div>
            </div>
            <p class="portfolio-card-note">
              「これは無理だ」「意味がない」と言われたところから、プロトタイプで可能性を示し、対話しながら実用に育てていったものです。<br />
              テレビや雑誌などのマスコミ媒体でも繰り返し取り上げられ、後続の新機能を生み出す原動力にもなりました。
            </p>

            <a href="https://ds.yahoo.co.jp/service/insight/" class="portfolio-link" target="_blank" rel="noopener noreferrer">
              サービスサイトを見る
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>

      </div>
    </section>

    <!-- こんな方へ -->
    <section id="for-you">
      <div class="ac-wrap">
        <p class="section-label">For You</p>
        <h2 class="section-title">こんな方へ</h2>
        <ul class="for-you-list">
          <li>
            <span class="check">✓</span>
            「なんとなくこういうものが欲しい」という段階で止まっている人。
          </li>
          <li>
            <span class="check">✓</span>
            既製のアプリだと、うちのやり方に合わないと感じている人。
          </li>
          <li>
            <span class="check">✓</span>
            まず動くものを見てから、社内で判断したい人。
          </li>
          <li>
            <span class="check">✓</span>
            手元に眠っているデータを、何かに活かしたい人。
          </li>
          <li>
            <span class="check">✓</span>
            こちらの要望をじっくり聞いてもらいながら進めたい人。
          </li>
        </ul>
        <p class="for-you-note">
          要件が決まっていなくて大丈夫です。<br>
          むしろその段階から声をかけてください。<br />
          現場で感じるお客様の声こそが、良いものを作る一番の材料だと思っています。
        </p>
      </div>
    </section>

    <!-- 自己紹介 -->
    <section id="about" class="ac-about">
      <div class="ac-wrap">
        <p class="section-label">About</p>
        <h2 class="section-title">動くものを、先に出すエンジニア</h2>
        <p class="about-intro">
          15年以上、検索データやユーザー行動データを「誰かの意思決定を動かす形」に変えることを仕事にしてきました。
        </p>

        <div class="about-grid">

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">🎧</span>
              <h3 class="about-card-title">要件が固まる前の段階に飛び込む</h3>
            </div>
            <div class="about-card-body">
              <p>得意なのは、要件が曖昧なままの段階に飛び込み、ユーザーや現場の声を丁寧に聞きながら、その場でプロトタイプを作ってしまうことです。</p>
              <p>聞くことと作ることを分けない。話しながら手を動かすので、「言ったことと違うものが出てくる」というズレが起きにくいのが強みです。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">⚡</span>
              <h3 class="about-card-title">プロトタイプが企画書</h3>
            </div>
            <div class="about-card-body">
              <p>仕様書や企画書を先に作るのではなく、動くものを先に作り、それを叩き台にして議論を前に進めます。</p>
              <p>何十時間も結論が出なかった会議に、動くプロトタイプを持ち込んで「これで決まり」となった経験が何度もあります。言葉を重ねるより、そのほうが速い。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">🤖</span>
              <h3 class="about-card-title">AIと二人三脚のものづくり</h3>
            </div>
            <div class="about-card-body">
              <p>近年は生成AIを使い、このサイクルをさらに高速化しています。AIに大枠の実装や選択肢を出させ、そこにある矛盾や粗を見つけて対話しながら磨き上げ、また実行させる。</p>
              <p>優秀なパートナーに指示を出すように進めるこのスタイルは、「まず作って直す」という自分のやり方と非常に相性が良いと感じています。</p>
            </div>
          </div>

          <div class="about-card">
            <div class="about-card-header">
              <span class="about-card-icon">📈</span>
              <h3 class="about-card-title">キャリアと実績</h3>
            </div>
            <div class="about-card-body">
              <p>大手インターネット企業に15年勤務し、大規模トラフィックデータを活用した分析SaaSの企画・開発に従事。性別・年齢・地域といった属性を軸に、ネットワーク図・散布図・ヒートマップなど目的に応じた可視化を設計してきました。</p>
              <p>自分のプロトタイプから生まれたプロダクトは、一部上場企業を中心に500社以上へ導入されています。</p>
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

    <!-- ご依頼について -->
    <section id="terms">
      <div class="ac-wrap">
        <p class="section-label">Terms</p>
        <h2 class="section-title">ご依頼について</h2>
        <p class="terms-intro">ご依頼前に知っておいていただきたい事項をまとめています。</p>
        <div class="terms-grid">

          <div class="terms-card">
            <div class="terms-icon">🧪</div>
            <h3 class="terms-card-title">これはプロトタイプです</h3>
            <p class="terms-card-body">アイディアの検証に特化した開発です。<br />本番運用・インフラ管理・セキュリティ対策・パフォーマンス最適化は対象外です。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">📦</div>
            <h3 class="terms-card-title">納品物</h3>
            <p class="terms-card-body">触れて動かせるWebアプリ（プロトタイプ）をお渡しします。<br />ソースコードのお渡しも可能ですが、プロトタイプとしての品質であり、本番転用・保守を前提とした実装ではない点をご了承ください。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🛠️</div>
            <h3 class="terms-card-title">技術スタック</h3>
            <p class="terms-card-body">Nuxt 3 / TypeScript / Cloudflare Workers・D1 / ECharts・Highcharts（可視化）/ OpenAI API・Claude API（生成AI）/ LINE連携 を中心に使用。<br />案件の内容に応じて最適な技術を選定します。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔄</div>
            <h3 class="terms-card-title">修正対応・開発スコープ</h3>
            <p class="terms-card-body">開発はご依頼時に合意した機能・仕様のみを対象とし、初期合意を大幅に超える仕様変更・追加機能は別途お見積もりになります。<br />プロトタイプの性質上、方向性の調整は歓迎します。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔐</div>
            <h3 class="terms-card-title">著作権</h3>
            <p class="terms-card-body">納品物の著作権はクライアントに完全に譲渡します。<br />ただし制作者は、制作実績としてデモ画面・URLをポートフォリオに掲載する権利を留保します。<br />掲載を希望されない場合はご相談ください。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">💻</div>
            <h3 class="terms-card-title">動作環境</h3>
            <p class="terms-card-body">Chromeの最新版（PC）を動作保証の対象とします。<br />スマートフォン対応が必要な場合は事前にお申し付けください。</p>
          </div>


        </div>

        <div class="terms-payment">
          <div class="terms-payment-header">
            <span class="terms-payment-icon">💳</span>
            <h3 class="terms-payment-title">開発費用・お支払い</h3>
          </div>
          <div class="terms-payment-body">
            <div class="terms-payment-row">
              <span class="terms-payment-label">ヒアリング</span>
              <span class="terms-payment-value">¥8,000 / 時間（約2時間を想定）</span>
            </div>
            <div class="terms-payment-row">
              <span class="terms-payment-label">開発費用</span>
              <span class="terms-payment-value">案件の規模・内容によるため、ヒアリング後にお見積もり</span>
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
          <h2 class="cta-title">まず、話してみませんか。</h2>
          <p class="cta-desc">
            「こういうのが欲しいかも」「そんなことできる？」<br />
            そのくらいの温度感で十分です。一緒に考えます。
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
        <a href="https://prototype.insightlens.jp/miyako" class="ac-footer-link">Portfolio: 宮古島市議事録分析 →</a>
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
  title: 'prototyper | 動くものを、いちばん早く。',
  meta: [
    { name: 'description', content: '丁寧なヒアリングと高速プロトタイピングの相談窓口。現場の声を聞き、一般のアプリでは手の届かないところまで届く道具を、AIによるバイブコーディングで素早く形にします。データ可視化・AI機能もその一部として対応。' },
    { property: 'og:title', content: 'prototyper | 動くものを、いちばん早く。' },
    { property: 'og:description', content: '丁寧なヒアリングと高速プロトタイピングの相談窓口。議論より、動くプロトタイプ。要件が固まる前の段階からご相談ください。' },
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛠️</text></svg>` }],
})
</script>

<style>
@import '~/assets/css/prototyper.css';
</style>
