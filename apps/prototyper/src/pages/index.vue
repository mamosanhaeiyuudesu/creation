<template>
  <div class="pt-page">

    <!-- ヘッダー -->
    <header class="pt-header">
      <div class="pt-wrap pt-header-inner">
        <a href="#top" class="pt-logo">
          <img src="/images/prototyper-nav-logo.png" alt="prototyper" />
        </a>
        <nav class="pt-nav" :class="{ 'is-open': isMenuOpen }">
          <a v-for="n in navItems" :key="n.href" :href="n.href" @click="isMenuOpen = false">{{ n.label }}</a>
          <a :href="contactUrl" target="_blank" rel="noopener" class="pt-btn pt-btn-accent pt-nav-cta">無料相談</a>
        </nav>
        <button class="pt-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー：現場の一言 → 動く画面 -->
    <section id="top" class="pt-hero">
      <div class="pt-wrap pt-hero-inner">
        <div class="pt-hero-text">
          <p class="pt-hero-tag">ヒアリング × 高速プロトタイピング</p>
          <h1 class="pt-hero-catch">
            <span class="pt-nb">その一言を、</span><br />
            <span class="pt-nb pt-hero-catch-em">すぐ動く形に。</span>
          </h1>
          <p class="pt-hero-sub">
            お話を伺ったら、その場〜3日で動くものを作ります。<br class="pt-pc" />
            触って、直して、シンプルで長く使える形に育てます。
          </p>
          <ul class="pt-hero-chips">
            <li>ご相談60分 無料</li>
            <li>要件が決まる前からOK</li>
            <li>大手IT企業で17年</li>
          </ul>
          <a :href="contactUrl" target="_blank" rel="noopener" class="pt-btn pt-btn-accent pt-btn-lg">
            無料相談
            <span class="pt-btn-arrow" aria-hidden="true">→</span>
          </a>
          <p class="pt-btn-note">60分・試作品もその場でお渡しします</p>
        </div>

        <div class="pt-hero-visual">
          <figure class="pt-hero-bubble">
            <blockquote>表がみにくいから、<br />ネットワーク図にしてはどうか？</blockquote>
            <figcaption>— ツールを使ってくれていた、現場の方の一言</figcaption>
          </figure>
          <div class="pt-hero-flow">
            <div class="pt-hero-pdfs" aria-label="議事録のPDF 160本以上">
              <div v-for="n in 3" :key="n" class="pt-hero-pdf">
                <span class="pt-hero-pdf-badge">PDF</span>
                <span class="pt-hero-pdf-title">第{{ 5 - n }}回 定例会 会議録</span>
                <i /><i /><i /><i /><i />
              </div>
              <p class="pt-hero-pdfs-count">議事録PDF<br /><b class="pt-num">160</b>本以上</p>
            </div>
            <span class="pt-hero-flow-arrow" aria-hidden="true">
              <svg viewBox="0 0 40 40" width="40" height="40"><path d="M8 20h22M22 11l9 9-9 9" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" /></svg>
            </span>
            <div class="pt-hero-device">
              <div class="pt-hero-device-bar"><i /><i /><i /></div>
              <img src="/images/miyako-network.png" alt="議事録の言葉どうしのつながりを表したネットワーク図の画面" />
            </div>
          </div>
          <p class="pt-hero-visual-note">実際に作った画面：宮古島市議会の議事録PDFを、言葉のつながりの図に</p>
        </div>
      </div>
    </section>

    <!-- こんなお悩み -->
    <section id="for-you" class="pt-section">
      <div class="pt-wrap">
        <p class="pt-label">FOR YOU</p>
        <h2 class="pt-title">こんなお悩み、<br class="pt-sp" />ありませんか？</h2>
        <ul class="pt-worry-grid">
          <li v-for="w in worries" :key="w.title" class="pt-worry">
            <span class="pt-worry-check" aria-hidden="true">✓</span>
            <div>
              <h3>{{ w.title }}</h3>
              <p>{{ w.body }}</p>
            </div>
          </li>
        </ul>
        <p class="pt-worry-note">
          ひとつでも当てはまれば、<strong>要件が決まっていない段階</strong>からご相談ください。<br class="pt-pc" />
          行政・農業・医療など、業種を問わずご一緒してきました。
        </p>
      </div>
    </section>

    <!-- 実績 -->
    <section id="portfolio" class="pt-section pt-section-tint">
      <div class="pt-wrap">
        <p class="pt-label">WORKS</p>
        <h2 class="pt-title">実績</h2>
        <p class="pt-lead">「どなたの、どんな困りごとを、どう解決したか」で並べています。</p>

        <article v-for="w in works" :key="w.title" class="pt-work">
          <header class="pt-work-head">
            <span class="pt-work-tag" :class="w.tagClass">{{ w.tag }}</span>
            <h3 class="pt-work-title">{{ w.title }}</h3>
            <div class="pt-work-meta">
              <span><b>STATUS</b>{{ w.now }}</span>
            </div>
          </header>

          <div class="pt-work-ba">
            <div class="pt-work-ba-col">
              <span class="pt-work-ba-label">WHO</span>
              <p>{{ w.who }}</p>
            </div>
            <div class="pt-work-ba-col is-before">
              <span class="pt-work-ba-label">PROBLEM</span>
              <p>{{ w.before }}</p>
            </div>
            <span class="pt-work-ba-arrow" aria-hidden="true">→</span>
            <div class="pt-work-ba-col is-after">
              <span class="pt-work-ba-label">SOLUTION</span>
              <p>{{ w.did }}</p>
            </div>
          </div>

          <div class="pt-shots" :class="`is-${w.shape}`">
            <figure v-for="f in w.features" :key="f.title" class="pt-shot">
              <button type="button" class="pt-shot-img" @click="openLightbox(f.image, f.title)">
                <img :src="f.image" :alt="f.title" loading="lazy" />
              </button>
              <figcaption>
                <h4>{{ f.title }}</h4>
                <p>{{ f.body }}</p>
                <a v-if="f.url" :href="f.url" target="_blank" rel="noopener" class="pt-text-link">この画面を開く →</a>
              </figcaption>
            </figure>
          </div>

          <footer class="pt-work-foot">
            <p v-if="w.note" class="pt-work-note">{{ w.note }}</p>
            <ul class="pt-tech">
              <li v-for="t in w.tech" :key="t">{{ t }}</li>
            </ul>
            <div class="pt-work-links">
              <a v-for="l in w.links" :key="l.url" :href="l.url" target="_blank" rel="noopener" class="pt-btn" :class="l.primary ? 'pt-btn-main' : 'pt-btn-outline'">
                {{ l.label }} <span aria-hidden="true">→</span>
              </a>
            </div>
          </footer>
        </article>
      </div>
    </section>

    <!-- お客様の声 -->
    <section id="voices" class="pt-section">
      <div class="pt-wrap">
        <p class="pt-label">VOICES</p>
        <h2 class="pt-title">お客様の声</h2>

        <div class="pt-voice">
          <div class="pt-voice-head">
            <span class="pt-voice-icon" aria-hidden="true">“</span>
            <div>
              <p class="pt-voice-person">農家のMさん</p>
              <p class="pt-voice-tool">会議の議事録づくり「キキガキ」</p>
            </div>
          </div>
          <div class="pt-voice-grid">
            <div v-for="v in voices" :key="v.title" class="pt-voice-point">
              <h3><span class="pt-marker">{{ v.title }}</span></h3>
              <p>{{ v.body }}</p>
            </div>
          </div>
          <div class="pt-voice-dev">
            <span class="pt-voice-dev-label">制作者より</span>
            <p>
              「シンプルにしたほうがいい」という一言が、いちばんの転換点でした。カレンダー連携や専用の辞書も考えていましたが、Mさんと業務の流れを確かめるうちに「なくても困らない」と分かり、あえて入れませんでした。
              <strong>必要なものだけに絞ることで、使われるものになり、費用も時間も抑えられる。</strong>これからも大切にしていくやり方です。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 進め方 -->
    <section id="process" class="pt-section pt-section-main">
      <div class="pt-wrap">
        <p class="pt-label is-light">PROCESS</p>
        <h2 class="pt-title is-light">進め方</h2>
        <ol class="pt-flow">
          <li v-for="(s, i) in processSteps" :key="s.title">
            <span class="pt-flow-num">STEP <span class="pt-num">{{ i + 1 }}</span></span>
            <h3>{{ s.title }}</h3>
            <p class="pt-flow-time">{{ s.time }}</p>
            <p>{{ s.body }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- よくある質問 -->
    <section id="faq" class="pt-section">
      <div class="pt-wrap pt-wrap-narrow">
        <p class="pt-label">FAQ</p>
        <h2 class="pt-title">よくある質問</h2>
        <dl class="pt-faq">
          <div v-for="q in faqs" :key="q.q" class="pt-faq-item">
            <dt>{{ q.q }}</dt>
            <dd>{{ q.a }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <!-- 費用 -->
    <section id="fees" class="pt-section pt-section-tint">
      <div class="pt-wrap">
        <p class="pt-label">FEES</p>
        <h2 class="pt-title">費用</h2>
        <div class="pt-price-grid">
          <div class="pt-price is-free">
            <p class="pt-price-name">ご相談</p>
            <p class="pt-price-amount"><span class="pt-num">0</span>円</p>
            <ul>
              <li>60分・オンライン可</li>
              <li>試作品もその場でお渡しします</li>
              <li>要件が決まっていなくても大丈夫です</li>
            </ul>
          </div>
          <div class="pt-price">
            <p class="pt-price-name">開発費用</p>
            <p class="pt-price-amount is-text">お見積り</p>
            <ul>
              <li>規模・内容に応じて、ヒアリング後にお出しします</li>
              <li>まずは<a href="#portfolio">実績</a>を参考に、お気軽にご相談ください</li>
            </ul>
          </div>
          <div class="pt-price">
            <p class="pt-price-name">運用・保守</p>
            <p class="pt-price-amount is-text">月額でご相談</p>
            <ul>
              <li>続けて担当する場合</li>
              <li>使いながらの改善もお受けします</li>
            </ul>
          </div>
        </div>
        <p class="pt-price-note">お支払い：開発費用の50%を着手前に、残金を納品時に</p>
      </div>
    </section>

    <!-- 私について -->
    <section id="about" class="pt-section">
      <div class="pt-wrap">
        <p class="pt-label">ABOUT</p>
        <h2 class="pt-title">私について</h2>

        <div class="pt-about">
          <div class="pt-about-photo">
            <img src="/images/portrait.jpg" alt="prototyper 代表の写真" />
          </div>
          <div class="pt-about-body">
            <p class="pt-about-eyebrow">大手インターネット企業17年のエンジニア</p>
            <p class="pt-about-catch">シンプルで、長く使えるサービスを。</p>
            <p>
              複雑になって使いにくくなったシステムや、活かされていないデータを、ヒアリングと開発力でシンプルな形に変えます。
              お話を伺ったらすぐに動くものを作り、触っていただきながら改善を重ねます。
            </p>
            <p>
              このやり方で、数百社以上に導入された検索ログ可視化ツールの主力機能など、多くのプロダクトを作ってきました。
            </p>
            <p class="pt-about-can-label">できること</p>
            <ul class="pt-about-can">
              <li v-for="c in canDo" :key="c">{{ c }}</li>
            </ul>
          </div>
        </div>

        <div class="pt-about-row">
          <div class="pt-origin">
            <p class="pt-origin-label">原点</p>
            <p class="pt-origin-quote">「表形式の検索キーワードのランキングは見にくいから、ネットワーク図にしてはどうか？」</p>
            <p class="pt-origin-cite">— 会社員時代、社内でツールを使ってくれていた一人の言葉</p>
            <ol class="pt-origin-steps">
              <li>その一言を、そのまま試作してみた</li>
              <li>思いがけず大きな反響があった</li>
              <li>いまは <a href="https://ds.yahoo.co.jp/service/insight/basic.html" target="_blank" rel="noopener">DS.INSIGHT Basic</a> の主力機能のひとつに</li>
            </ol>
            <p class="pt-origin-close"><span class="pt-marker">毎日それを使っている人が、答えを持っていた。</span></p>
          </div>

          <div class="pt-values">
            <p class="pt-values-label">3つのこだわり</p>
            <dl>
              <div v-for="v in values" :key="v.key" class="pt-value">
                <dt>{{ v.key }}</dt>
                <dd>{{ v.body }}</dd>
              </div>
            </dl>
            <p class="pt-profile">
              2002年 桐蔭学園理数科卒／2006年 慶應義塾大学 情報工学科卒。<br />
              心理カウンセラーとしても活動中。趣味は格闘技・野球観戦、子どもと始めた剣道、ベランダ農業。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section id="contact" class="pt-cta">
      <div class="pt-wrap pt-cta-inner">
        <p class="pt-cta-sub">そのくらいの温度感で十分です</p>
        <h2 class="pt-cta-title">「こういうの、できませんか？」</h2>
        <p class="pt-cta-note">まだ何も決まっていない段階で構いません。一緒に考えましょう。（ご相談 60分 無料）</p>
        <a :href="contactUrl" target="_blank" rel="noopener" class="pt-btn pt-btn-accent pt-btn-lg">
          無料相談
          <span class="pt-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="pt-btn-note">60分・試作品もその場でお渡しします</p>
      </div>
    </section>

    <footer class="pt-footer">
      <div class="pt-wrap pt-footer-inner">
        <span>&copy; 2026 prototyper</span>
        <span class="pt-footer-links">
          <NuxtLink to="/legal">特定商取引法に基づく表記</NuxtLink>
          <a href="https://data-vis.insightlens.jp" target="_blank" rel="noopener">データ可視化の受託制作（data-vis）</a>
        </span>
      </div>
    </footer>

    <!-- スクリーンショットの拡大表示 -->
    <Teleport to="body">
      <div v-if="lightbox.open" class="pt-lightbox" @click="closeLightbox">
        <button class="pt-lightbox-close" aria-label="閉じる" @click="closeLightbox">×</button>
        <img :src="lightbox.src" :alt="lightbox.alt" @click.stop />
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'prototyper' })

const contactUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSd_h56W-9kJJRto5rqojYJ9HdDta9hLtcQ4Kk_sUeNL6cCTUQ/viewform?usp=dialog'

const isMenuOpen = ref(false)

const navItems = [
  { href: '#portfolio', label: '実績' },
  { href: '#voices', label: 'お客様の声' },
  { href: '#process', label: '進め方' },
  { href: '#faq', label: 'よくある質問' },
  { href: '#fees', label: '費用' },
  { href: '#about', label: '私について' },
]

const worries = [
  { title: '既成サービスが合わない', body: 'Salesforce・kintone・Notion などは、うちのやり方に合わない。' },
  { title: '社内システムが使いこなせない', body: '複雑で使いにくく、現場の人が使えていない。' },
  { title: '規模が小さくて頼みにくい', body: 'ITで効率化したいが、どこも引き受けてくれない気がする。' },
  { title: 'データが眠っている', body: '記録やデータは溜まっているのに、活かせていない。' },
  { title: '何から相談すればいいか', body: '問題意識はあるが、そもそも何を頼めばいいか分からない。' },
]

interface Feature {
  title: string
  body: string
  image: string
  url?: string
}

interface Work {
  tag: string
  tagClass?: string
  title: string
  now: string
  who: string
  before: string
  did: string
  /** スクリーンショットの形。wide＝横長2枚、portrait＝スマホ縦長3枚 */
  shape: 'wide' | 'portrait'
  features: Feature[]
  note?: string
  tech: string[]
  links: { label: string; url: string; primary?: boolean }[]
}

const works: Work[] = [
  {
    tag: '公開・稼働中',
    title: '宮古島市議会 議事録の可視化',
    now: '公開中。どなたでも触れます',
    who: '市政に関心のある市民の方',
    before: '議事録はPDFで公開されているが、約20年分・160本以上あり、誰も読めていなかった',
    did: '文章を単語に分け、最近の話題や言葉のつながりを、読まずに眺めて探せる形にしました',
    shape: 'wide',
    features: [
      {
        title: '最近の議会で増えた言葉が、大きく浮かび上がる',
        body: '新しく出てきた言葉や急に増えた言葉を大きく表示。いま何が議題の中心かが一目で分かります。',
        image: '/images/miyako-trend.png',
        url: 'https://prototype.insightlens.jp/miyako',
      },
      {
        title: 'つながりの図で、議論の全体像を見る',
        body: 'よく議論された言葉を円の大きさで、一緒に語られた言葉を線で。何と何が結びついているかが分かります。',
        image: '/images/miyako-network.png',
        url: 'https://prototype.insightlens.jp/miyako/network',
      },
    ],
    note: 'ほかに「言葉ごとの議論の流れ」「年ごと」「議員ごと」の画面もあります。詳しくは data-vis で紹介しています。',
    tech: ['Nuxt', 'ECharts', 'OpenAI API', 'Cloudflare Workers・D1', '形態素解析', 'TF-IDF'],
    links: [
      { label: '実際に触ってみる', url: 'https://prototype.insightlens.jp/miyako', primary: true },
      { label: 'data-vis で詳しく見る', url: 'https://data-vis.insightlens.jp' },
    ],
  },
  {
    tag: '一般公開中（モニター期間）',
    tagClass: 'is-trial',
    title: '会議の議事録づくり「キキガキ」',
    now: '一般公開中。モニター期間中は無料',
    who: '和歌山県の町で活動する、農家のみなさん',
    before: '会議の記録が残しっぱなしで、議事録にまとめる時間がなかった',
    did: '会議の文章を入れるだけで、AIが決まったこと・予定・やることを整理し、1枚のPDFにまとめる仕組みを作りました',
    shape: 'wide',
    features: [
      {
        title: '決まったこと・予定・やることを、AIが整理',
        body: 'その場で直せて、AIが聞き取れなかった所は「不明点」として先に教えてくれます。',
        image: '/images/kikigaki-pro-review.jpg',
      },
      {
        title: '会議の記録が、一か所にたまっていく',
        body: 'タグで整理して、あとから見返せます。PDFは指定したGoogleドライブにも保存できます。',
        image: '/images/kikigaki-pro-list.jpg',
      },
    ],
    note: '農家のみなさんとの実証実験から生まれ、いまはどなたでも登録して使えるサービスとして公開しています。',
    tech: ['Nuxt', 'Cloudflare Workers・D1', 'Claude API', 'Firebase Auth', 'Google Drive連携'],
    links: [{ label: 'サービスを見る', url: 'https://kikigaki.insightlens.jp/', primary: true }],
  },
  {
    tag: '公開・稼働中',
    title: '晴レルヤ鍼灸院 ホームページ制作',
    now: '公開中',
    who: '新しく開業された鍼灸院の先生',
    before: '開業にあたって、ホームページがなかった',
    did: '院の特徴と、迷わず来られる道案内が伝わるホームページを制作しました',
    shape: 'portrait',
    features: [
      {
        title: '開いてすぐ、院の強みが伝わる',
        body: '2つの施術の特徴を、写真とあわせて最初の画面で。LINE予約への入口もここから。',
        image: '/images/hareruya-top.png',
      },
      {
        title: '施術の特徴を、写真とともに',
        body: '初めての方が抱く不安に、先回りして答える構成にしました。',
        image: '/images/hareruya-features.png',
      },
      {
        title: '写真をめくって進む道案内',
        body: 'ビルの一室まで、曲がり角ごとの実写真で迷わず来られます。',
        image: '/images/hareruya-access.png',
      },
    ],
    tech: ['Nuxt', 'Cloudflare Workers'],
    links: [{ label: 'サイトを見る', url: 'https://hareruya.insightlens.jp/', primary: true }],
  },
]

const voices = [
  {
    title: '思いを汲み取って作ってくれた',
    body: '以前お願いしたエンジニアさんは仕組みには詳しくても、私たちの悩みまでは汲み取ってもらえませんでした。まもりんさんはこちらの思いを丁寧に汲み取って作ってくれるので、とても助かりました。',
  },
  {
    title: '「これはもう、100点満点ですね」',
    body: '何が決まり、次の予定はいつか。全部が1枚のPDFに整理されていて、見返すだけでその日の会議が思い浮かぶ。多少の誤字は、自分で直せばいいだけです。',
  },
  {
    title: 'シンプルにしたことが、正解だった',
    body: '機能を詰め込まず、カレンダーと直接つながなかったのが正解。指定したGoogleドライブのフォルダにそのまま収まっていくのが、地味にすごく便利です。',
  },
  {
    title: '農業に限らず、どこでも使える',
    body: '家族にPDFをLINEで送れば「こんな会議だったんだ」とすぐ伝わる。普通の会議でも十分通用するレベルだと思います。',
  },
]

const processSteps = [
  { title: 'お話を聞く', time: '60分・オンライン可', body: 'お困りごとや実現したいこと、現場の使い方を伺います。' },
  { title: 'すぐ作る', time: 'その場〜3日', body: '動く試作品を作ります。Web・スマホ・LINE・ホームページなど最適な形で。' },
  { title: '触って、直す', time: '2〜3週間', body: '使っていただき、納得がいくまで何度でもシンプルに直します。' },
  { title: '現場で試す', time: '2〜3週間', body: '実際の業務で使い、不具合や使い勝手を確かめます。' },
  { title: '方針を決める', time: '', body: 'このまま運用するか、設計図にして専門チームへ渡すかを一緒に決めます。' },
]

const faqs = [
  {
    q: '最終的な成果物はなんですか？',
    a: 'そのまま運用まで担当する場合は、実際に使えるWebアプリ・スマホアプリなど。大規模になり他社へ引き継ぐ場合は、試作品・企画書・設計書一式をお渡しします。',
  },
  {
    q: '途中で変更・修正は頼めますか？',
    a: 'ご相談時に合意した内容の範囲で対応します。合意を大きく超える変更・追加は、別途お見積りになります。',
  },
  {
    q: 'どのような技術を使っていますか？',
    a: 'Nuxt / TypeScript / Cloudflare Workers・D1 / ECharts（データの可視化）/ OpenAI API・Claude API（AI機能）/ LINE連携 などを中心に、内容に応じて選びます。',
  },
]

const canDo = ['Webサービス', 'ホームページ', 'LINEアプリ', 'データ分析・可視化', 'Google・LINE連携', 'スマホアプリ', 'ITコンサル']

const values = [
  { key: '原点思考', body: '「そもそも何を実現したいのか」に、いつも立ち返ります。' },
  { key: '共創', body: 'ヒアリングを重ねながら、お客様と一緒に作ります。' },
  { key: 'シンプル', body: '余計なものを削ぎ落とし、長く使える形にします。' },
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

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeLightbox()
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

useHead({
  title: 'prototyper | 答えは、いつもあなたの中にある。',
  htmlAttrs: { lang: 'ja' },
  meta: [
    { name: 'description', content: 'ものづくりの主役は、つくる人ではなくあなた自身。実現したいことをじっくり伺い、触れるプロトタイプにして一緒に育てます。ITが苦手な方でも大丈夫。規模に応じて、運用まで担当することも、設計図にして専門チームへ渡すこともできます。' },
    { property: 'og:title', content: 'prototyper | 答えは、いつもあなたの中にある。' },
    { property: 'og:description', content: 'あなたの中にすでにある答えを、触れる形にして一緒に育てる。ITが苦手な方でも安心して話せる、ヒアリングとプロトタイピングの相談窓口です。' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://prototyper.insightlens.jp/' },
    { property: 'og:image', content: 'https://prototyper.insightlens.jp/images/prototyper-ogp.png' },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:image', content: 'https://prototyper.insightlens.jp/images/prototyper-ogp.png' },
  ],
  link: [{ rel: 'icon', type: 'image/png', href: '/images/prototyper-icon.png' }],
})
</script>

<style>
@import '~/assets/css/prototyper.css';
</style>
