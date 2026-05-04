<template>
  <div class="ac-page">

    <!-- ナビゲーション -->
    <nav class="ac-nav">
      <div class="ac-nav-inner">
        <span class="ac-nav-logo">data-vis</span>
        <ul class="ac-nav-links">
          <li><a href="#services">できること</a></li>
          <li><a href="#portfolio">ポートフォリオ</a></li>
          <li><a href="#for-you">こんな方へ</a></li>
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
            <span class="hero-eyebrow">Data Visualization &amp; Prototype Development</span>
            <h1 class="hero-catch">
              あなたのデータは、<br />
              <span>宝の山</span>
            </h1>
            <div class="hero-sub">
              <p>手元に眠っている数値データや文章、ちゃんと活かせていますか？</p>
              <p>
                集めたまま放置されているデータは、見方を変えるだけでまったく違う顔を見せます。<br />
                性別・年代・地域・時間——多様な切り口を持つデータほど、料理のしがいがある素材です。
              </p>
              <p>
                私がやることはシンプルです。<br/>「もやっとしたデータ」を、人が見て面白い！なるほど！と思える形に変えること。<br />
                見せ方ひとつで「へえ、そうだったのか」と思ってもらえる瞬間——そこに一番の喜びを感じています。
              </p>
              <p>データはある。<br />でも何をすればいいかわからない。<br />そんなもやっとした感覚を持っていたら、ぜひ一度声をかけてください。</p>
            </div>
            <a href="#contact" class="hero-cta">
              まずは相談する
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div class="hero-viz-deco" aria-hidden="true">
            <svg viewBox="0 0 380 268" fill="none" xmlns="http://www.w3.org/2000/svg" class="hero-chart-svg">
              <defs>
                <linearGradient id="heroAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="rgba(27,95,217,0.10)"/>
                  <stop offset="100%" stop-color="rgba(27,95,217,0.00)"/>
                </linearGradient>
              </defs>
              <!-- チャートタイトル -->
              <text x="58" y="13" font-family="'IBM Plex Mono',monospace" font-size="8" font-weight="500" fill="rgba(27,95,217,0.42)" letter-spacing="0.12em">INSIGHT_INDEX ↑</text>
              <!-- 水平グリッド線 -->
              <line x1="58" y1="38" x2="362" y2="38" stroke="rgba(27,95,217,0.09)" stroke-width="1" stroke-dasharray="3 5"/>
              <line x1="58" y1="84" x2="362" y2="84" stroke="rgba(27,95,217,0.09)" stroke-width="1" stroke-dasharray="3 5"/>
              <line x1="58" y1="130" x2="362" y2="130" stroke="rgba(27,95,217,0.09)" stroke-width="1" stroke-dasharray="3 5"/>
              <line x1="58" y1="176" x2="362" y2="176" stroke="rgba(27,95,217,0.09)" stroke-width="1" stroke-dasharray="3 5"/>
              <!-- 軸 -->
              <line x1="58" y1="20" x2="58" y2="228" stroke="rgba(27,95,217,0.22)" stroke-width="1.5"/>
              <line x1="58" y1="228" x2="370" y2="228" stroke="rgba(27,95,217,0.22)" stroke-width="1.5"/>
              <!-- Y軸目盛り -->
              <line x1="52" y1="38" x2="58" y2="38" stroke="rgba(27,95,217,0.3)" stroke-width="1.5"/>
              <line x1="52" y1="84" x2="58" y2="84" stroke="rgba(27,95,217,0.3)" stroke-width="1.5"/>
              <line x1="52" y1="130" x2="58" y2="130" stroke="rgba(27,95,217,0.3)" stroke-width="1.5"/>
              <line x1="52" y1="176" x2="58" y2="176" stroke="rgba(27,95,217,0.3)" stroke-width="1.5"/>
              <!-- Y軸ラベル -->
              <text x="46" y="42" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.38)" text-anchor="end">4k</text>
              <text x="46" y="88" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.38)" text-anchor="end">3k</text>
              <text x="46" y="134" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.38)" text-anchor="end">2k</text>
              <text x="46" y="180" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.38)" text-anchor="end">1k</text>
              <!-- バー -->
              <g class="hero-chart-bars">
                <rect x="70" y="198" width="26" height="30" fill="rgba(27,95,217,0.10)" rx="2"/>
                <rect x="112" y="176" width="26" height="52" fill="rgba(27,95,217,0.12)" rx="2"/>
                <rect x="154" y="152" width="26" height="76" fill="rgba(27,95,217,0.14)" rx="2"/>
                <rect x="196" y="124" width="26" height="104" fill="rgba(27,95,217,0.16)" rx="2"/>
                <rect x="238" y="90" width="26" height="138" fill="rgba(27,95,217,0.18)" rx="2"/>
                <rect x="280" y="60" width="26" height="168" fill="rgba(27,95,217,0.20)" rx="2"/>
                <rect x="322" y="32" width="26" height="196" fill="rgba(27,95,217,0.22)" rx="2"/>
              </g>
              <!-- エリア塗り -->
              <path d="M83,200 L125,178 L167,155 L209,127 L251,93 L293,63 L335,35 L335,228 L83,228 Z" fill="url(#heroAreaGrad)"/>
              <!-- トレンドライン -->
              <polyline points="83,200 125,178 167,155 209,127 251,93 293,63 335,35" fill="none" stroke="#1b5fd9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hero-trend-line"/>
              <!-- データポイント -->
              <g class="hero-data-pts">
                <circle cx="83" cy="200" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
                <circle cx="125" cy="178" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
                <circle cx="167" cy="155" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
                <circle cx="209" cy="127" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
                <circle cx="251" cy="93" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
                <circle cx="293" cy="63" r="3.5" fill="#f0f4fb" stroke="#1b5fd9" stroke-width="1.5"/>
              </g>
              <!-- ピークポイント（オレンジ） -->
              <circle cx="335" cy="35" r="5.5" fill="#f5700a" class="hero-data-peak"/>
              <circle cx="335" cy="35" r="11" fill="none" stroke="#f5700a" stroke-width="1.2" class="hero-peak-ring"/>
              <!-- ピークアノテーション -->
              <g class="hero-peak-annotation">
                <line x1="335" y1="22" x2="335" y2="14" stroke="#f5700a" stroke-width="1.2" stroke-dasharray="2 2"/>
                <text x="335" y="10" font-family="'IBM Plex Mono',monospace" font-size="7.5" fill="#f5700a" font-weight="600" text-anchor="middle" letter-spacing="0.1em">PEAK</text>
              </g>
              <!-- X軸ラベル -->
              <text x="83" y="244" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.36)" text-anchor="middle">'18</text>
              <text x="167" y="244" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.36)" text-anchor="middle">'20</text>
              <text x="251" y="244" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.36)" text-anchor="middle">'22</text>
              <text x="335" y="244" font-family="'IBM Plex Mono',monospace" font-size="8.5" fill="rgba(27,95,217,0.58)" text-anchor="middle" font-weight="600">'24</text>
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
        <div class="service-grid">

          <div class="service-card">
            <div class="service-icon">📊</div>
            <h3 class="service-card-title">テキスト・データ可視化</h3>
            <div class="service-card-body">
              <p>
                社内に眠っているテキストデータや数値データは、見せ方を変えるだけで全く違う景色になります。
              </p>
              <p>
                議事録・社内ログ・検索データ・アクセス履歴——これらはただの記録ではなく、組織や利用者の行動パターンが詰まった資産です。
              </p>
              <p>
                形態素解析やAIを活用した前処理から、Highcharts・EChartsを使ったインタラクティブな可視化まで、バックエンドの集計処理を含めて一貫して対応します。
              </p>
            </div>
          </div>

          <!-- <div class="service-card">
            <div class="service-icon">🤖</div>
            <h3 class="service-card-title">メンタル系チャットボット開発</h3>
            <div class="service-card-body">
              <p>
                傾聴・励まし・セルフケアサポートなど、メンタルヘルス領域に特化したAIチャットボットの開発実績があります。
              </p>
              <p>
                「こういう雰囲気で話しかけてほしい」「こんな場面で使いたい」という感覚的なイメージから、AIの応答スタイルや会話の流れを一緒に設計します。
              </p>
              <p>
                セラピスト・カウンセラー・支援職の方が現場で使えるツールを、現場の声を聞きながらプロトタイプします。
              </p>
            </div>
          </div> -->

        </div>
        <div class="services-scope">
          <div class="services-scope-item services-scope-in">
            <span class="scope-label">担当範囲</span>
            <span class="scope-text">アイデアの検証 / プロトタイプ開発</span>
          </div>
          <div class="services-scope-item services-scope-out">
            <span class="scope-label">対象外</span>
            <span class="scope-text">本番運用・インフラ管理</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ポートフォリオ -->
    <section id="portfolio" class="ac-portfolio">
      <div class="ac-wrap">
        <p class="section-label">Portfolio</p>
        <h2 class="section-title">制作事例</h2>
        <p class="section-body" style="margin-bottom: 0;">
          実際に開発したツールをご紹介します。
        </p>

        <div class="portfolio-card">
          <div class="portfolio-card-header">
            <span class="portfolio-tag">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              公開デモあり
            </span>
            <h3 class="portfolio-card-title">宮古島市議会議事録 分析ツール</h3>
            <p class="portfolio-card-lead">
              公開されている宮古島市議会の議事録テキストを自然言語処理で分析し、キーワードの出現傾向をインタラクティブに可視化。AIによる議論要約も搭載したWebアプリです。
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
                  <a href="https://prototype.insightlens.jp/miyako" class="feature-link" target="_blank">
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
            データはあるけど、どう見せればいいかわからない人。
          </li>
          <li>
            <span class="check">✓</span>
            「なんとなくこういう画面が欲しい」という段階で止まっている人。
          </li>
          <li>
            <span class="check">✓</span>
            プロトタイプをまず作って、社内で見せてみたい人。
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
        <h2 class="section-title">データを「気づきに変える」エンジニア</h2>
        <div class="section-body">
          <p>
            大手インターネット企業に15年勤務し、データ可視化・分析に携わってきたエンジニアです。
          </p>
          <p>
            ずっとやってきたのは、埋もれているデータを「見た人が何かに気づける」形に変えること。<br />
            検索データ・ログ・議事録・テキストなど、そのままでは意味を読み取りにくいデータを、インタラクティブなグラフやダッシュボードとして可視化してきました。
          </p>
          <p>
            「どう集計すれば面白いインサイトが出るか」「どう見せれば一番伝わるか」を、データの性質から一緒に考えるのが自分の仕事だと思っています。
          </p>
          <p>
            大手インターネット企業では、大規模トラフィックデータを活用した分析SaaSツールの企画・開発に従事。<br />
            性別・年齢・地域などの顧客属性データを軸に、ネットワーク図・散布図・棒グラフ・ヒートマップなど目的に応じた可視化手法を設計し、ユーザーが直感的にインサイトを得られるプロダクトを開発してきました。
          </p>
          <p>
            「プロトタイプが企画書だ」という信念のもと、会議や議論の場で言葉を重ねるよりも、まず手を動かしてアイデアを形にすることでプロジェクトを前に進めて、多くのツールをSaaS化してきました。<br />
            自身の長年の経験に加えて、他社事例を素早く参照・応用しながら具体的なプロトタイプを作り、チームや顧客の意思決定を加速させるスタイルが自分の強みです。
          </p>
          <p>
            自分のプロトタイプから生まれたプロダクトは、一部上場企業を中心に500社以上に導入。<br />
            テレビをはじめとするマスコミ媒体でも繰り返し取り上げられ、幾多の新製品を生み出す原動力にもなってきました。
          </p>
          <p>
            クライアントへのヒアリングからバックエンド（Python）・フロントエンド（Nuxt）まで一貫して自分一人で担当し、顧客の声を聞きながら試行錯誤で改善していくプロセスを得意としています。<br />
            近年は生成AIを活用した分析機能の実装にも取り組んでいます。
          </p>
          <p>
            桐蔭学園理数科卒、慶応義塾大学情報工学科卒業。<br>
            趣味は子どもと始めた剣道、ベランダ農業。<br>
            他に副業としてカウンセリングもやっています。
            </p>
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
            <p class="terms-card-body">Nuxt 3 / TypeScript / Cloudflare Workers / ECharts・Highcharts（可視化）/ OpenAI API・Claude API（生成AI）を中心に使用。<br />案件の内容に応じて最適な技術を選定します。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔄</div>
            <h3 class="terms-card-title">修正対応</h3>
            <p class="terms-card-body">プロトタイプの性質上、方向性の調整は歓迎します。<br />ただし初期合意を大幅に超える仕様変更・追加機能は別途ご相談になります。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">📋</div>
            <h3 class="terms-card-title">開発スコープ</h3>
            <p class="terms-card-body">ご依頼時に合意した機能・仕様のみを開発します。<br />追加機能の実装は都度お見積もりになります。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">🔐</div>
            <h3 class="terms-card-title">著作権</h3>
            <p class="terms-card-body">納品物の著作権はクライアントに完全に譲渡します。<br />ただし制作者は、制作実績としてデモ画面・URLをポートフォリオに掲載する権利を留保します。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">💻</div>
            <h3 class="terms-card-title">動作環境</h3>
            <p class="terms-card-body">Chrome・Firefox・Safari の最新版（PC）を動作保証の対象とします。<br />スマートフォン・タブレット対応が必要な場合は事前にお申し付けください。</p>
          </div>

          <div class="terms-card">
            <div class="terms-icon">✅</div>
            <h3 class="terms-card-title">検収</h3>
            <p class="terms-card-body">納品後14日以内にご報告いただいた不具合は無償で対応します。<br />それ以降の対応は有償となります。</p>
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
            <a href="mailto:" class="btn-primary">
              メールで相談する
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            </a>
            <a href="https://prototype.insightlens.jp/miyako" class="btn-secondary" target="_blank">
              デモを触ってみる
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="ac-footer">
      <div class="ac-footer-inner">
        <span class="ac-footer-copy">&copy; 2026 Prototyper</span>
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
  title: 'data-biz | あなたのデータは宝の山',
  meta: [
    { name: 'description', content: 'データ可視化・プロトタイプ開発の相談窓口。手元に眠っているデータを、触れて気づきが得られるインタラクティブな可視化に変えます。大手企業でデータ可視化・分析に15年以上携わってきたエンジニアです。' },
    { property: 'og:title', content: 'Prototyper | あなたのデータは、宝の山' },
    { property: 'og:description', content: 'データ可視化・プロトタイプ開発の相談窓口。手元に眠っているデータを、触れて気づきが得られるインタラクティブな可視化に変えます。' },
  ],
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🛠️</text></svg>` }],
})
</script>

<style>
@import '~/assets/css/prototyper.css';
</style>
