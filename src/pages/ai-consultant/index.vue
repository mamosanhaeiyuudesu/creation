<template>
  <div class="ac-page">

    <!-- ナビゲーション -->
    <nav class="ac-nav">
      <div class="ac-nav-inner">
        <span class="ac-nav-logo">AI Consultant</span>
        <ul class="ac-nav-links">
          <li><a href="#services">できること</a></li>
          <li><a href="#portfolio">ポートフォリオ</a></li>
          <li><a href="#for-you">こんな方へ</a></li>
          <li><a href="#about">自己紹介</a></li>
          <li><a href="#contact">お問い合わせ</a></li>
        </ul>
      </div>
    </nav>

    <!-- ヒーロー -->
    <section class="ac-hero">
      <div class="ac-wrap">
        <span class="hero-eyebrow">Data Visualization &amp; Prototype Development</span>
        <h1 class="hero-catch">
          モヤッとしたまま、<br />
          <span>来てください。</span>
        </h1>
        <p class="hero-sub">
          「なんとなくこういうのが欲しい」から一緒に形にします。<br />
          最初から答えありきではなく、お客様と同じ目線で考えながら進めるスタイルです。<br />
          モヤッとしたイメージを聞いて形にし、フィードバックを重ねながら一緒に育てていきます。
        </p>
        <a href="#contact" class="hero-cta">
          まずは相談する
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
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

          <div class="service-card">
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
          </div>

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
                  <strong>キーワード×会期 ヒートマップ</strong>
                  任意のキーワードが各会期でどれだけ議論されたかをTF-IDFスコアでヒートマップ表示。年代をまたいだトレンド変化を一目で把握できます。
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>AI議論要約パネル</strong>
                  キーワードを選択すると、その会期での関連発言をOpenAI APIで要約・分析。トピック・結論・議論の流れを自動生成します。
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>議員別TF-IDFランキング</strong>
                  議員ごとの発言傾向を単語・カテゴリ別に分析。色分けされたランキングテーブルで各議員の関心分野を可視化します。
                </div>
              </div>
              <div class="portfolio-feature">
                <span class="feature-dot"></span>
                <div class="feature-text">
                  <strong>ワードクラウド</strong>
                  会期別の頻出語をインタラクティブなワードクラウドで表示。全文検索と組み合わせて直感的に探索できます。
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

            <NuxtLink to="/miyako" class="portfolio-link" target="_blank">
              デモを見る
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </NuxtLink>
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
            大手企業でデータ可視化・分析に15年以上携わってきたエンジニアです。
          </p>
          <p>
            ずっとやってきたのは、埋もれているデータを「見た人が何かに気づける」形に変えること。<br />
            検索データ・ログ・議事録・テキストなど、そのままでは意味を読み取りにくいデータを、インタラクティブなグラフやダッシュボードとして可視化してきました。
          </p>
          <p>
            「どう集計すれば面白いインサイトが出るか」「どう見せれば一番伝わるか」を、データの性質から一緒に考えるのが自分の仕事だと思っています。
          </p>
          <p>
            大手IT企業の社員として、大規模トラフィックデータを活用した分析SaaSツールの企画・開発に従事。<br />
            性別・年齢・地域などの顧客属性データを軸に、地図・棒グラフ・ヒートマップなど目的に応じた可視化手法を設計し、ユーザーが直感的にインサイトを得られるプロダクトを開発してきました。
          </p>
          <p>
            プロダクトの多くは自分の発案がベースとなっており、「プロトタイプが企画書だ」という信念のもと、会議や議論の場で言葉を重ねるよりも、まず手を動かしてアイデアを形にすることでプロジェクトを前に進めてきました。<br />
            他社事例を素早く参照・応用しながら具体的なプロトタイプを作り、チームや顧客の意思決定を加速させるスタイルが自分の強みです。
          </p>
          <p>
            クライアントへのヒアリングからバックエンド（Python）・フロントエンド（Nuxt）まで一貫して自分一人で担当し、顧客の声を聞きながら試行錯誤で改善していくプロセスを得意としています。<br />
            近年は生成AIを活用したクラスタリングや分析機能の実装にも取り組んでいます。
          </p>
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
          <div class="cta-buttons">
            <a href="mailto:" class="btn-primary">
              メールで相談する
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
            </a>
            <NuxtLink to="/miyako" class="btn-secondary" target="_blank">
              デモを触ってみる
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="ac-footer">
      <div class="ac-footer-inner">
        <span class="ac-footer-copy">&copy; 2026 AI Consultant</span>
        <NuxtLink to="/miyako" class="ac-footer-link">Portfolio: 宮古島市議事録分析 →</NuxtLink>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ai-consultant' })

useHead({
  title: 'AI Consultant | モヤッとしたまま、来てください。',
  meta: [
    { name: 'description', content: 'データ可視化・プロトタイプ開発の相談窓口。「なんとなくこういうのが欲しい」から一緒に形にします。大手企業でデータ可視化・分析に15年以上携わってきたエンジニアです。' },
    { property: 'og:title', content: 'AI Consultant | モヤッとしたまま、来てください。' },
    { property: 'og:description', content: 'データ可視化・プロトタイプ開発の相談窓口。「なんとなくこういうのが欲しい」から一緒に形にします。' },
  ],
})
</script>

<style>
@import '~/assets/css/ai-consultant.css';
</style>
