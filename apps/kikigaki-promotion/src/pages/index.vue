<template>
  <div class="kp-page">
    <header class="kp-header">
      <div class="kp-wrap kp-header-inner">
        <a href="#top" class="kp-logo">
          <span class="kp-logo-mark" aria-hidden="true">📒</span>
          <span class="kp-logo-name">{{ site.serviceName }}</span>
        </a>
        <nav class="kp-nav" :class="{ 'is-open': isMenuOpen }">
          <a v-for="n in navItems" :key="n.href" :href="n.href" @click="isMenuOpen = false">{{ n.label }}</a>
          <a :href="site.appUrl" class="kp-btn kp-btn-cta kp-nav-cta">{{ site.ctaLabel }}</a>
        </nav>
        <button class="kp-menu-btn" :aria-expanded="isMenuOpen" aria-label="メニュー" @click="isMenuOpen = !isMenuOpen">
          <span /><span /><span />
        </button>
      </div>
    </header>

    <!-- ヒーロー -->
    <section id="top" class="kp-hero">
      <div class="kp-wrap kp-hero-inner">
        <p class="kp-hero-tag">聞いたこと、話したことを、あとからもう一度</p>
        <h1 class="kp-hero-catch">
          <span class="kp-nb">あの人との大切な会話を、</span><br />
          <span class="kp-nb kp-hero-em">記録しませんか。</span>
        </h1>
        <p class="kp-hero-sub">
          会議や面談の文字起こしを貼るだけで、<br class="kp-pc" />
          あとから読み返しやすい「PDF1枚の記録」にまとまります。
        </p>
        <a :href="site.appUrl" class="kp-btn kp-btn-cta kp-btn-lg">
          {{ site.ctaLabel }}
          <span class="kp-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="kp-hero-note">{{ heroNote }}</p>
        <p class="kp-dev-link"><a :href="site.prototyperUrl" target="_blank" rel="noopener">{{ site.prototyperLabel }} →</a></p>
      </div>
    </section>

    <!-- こんな方に -->
    <section id="for" class="kp-section kp-section-tint">
      <div class="kp-wrap">
        <p class="kp-label">FOR YOU</p>
        <h2 class="kp-title">こんな方に</h2>
        <ul class="kp-for-grid">
          <li v-for="f in forList" :key="f" class="kp-for">{{ f }}</li>
        </ul>
      </div>
    </section>

    <!-- お客様の声 -->
    <section id="voice" class="kp-section">
      <div class="kp-wrap">
        <p class="kp-label">VOICE ／ お客様の声</p>
        <h2 class="kp-title">貼るだけで、整って、共有しやすい。</h2>
        <div v-for="p in people" :key="p.name" class="kp-voice-person">
          <h3 class="kp-voice-name"><span class="kp-marker">{{ p.name }}</span><span class="kp-voice-job">{{ p.job }}</span></h3>
          <p class="kp-lead">{{ p.lead }}</p>
          <div class="kp-voice-list">
            <article v-for="v in p.items" :key="v.scene" class="kp-voice">
              <h4 class="kp-voice-scene">{{ v.scene }}</h4>
              <div class="kp-voice-ba">
                <div class="kp-voice-before">
                  <span class="kp-voice-tag">BEFORE</span>
                  <p>{{ v.before }}</p>
                </div>
                <span class="kp-voice-arrow" aria-hidden="true">→</span>
                <div class="kp-voice-after">
                  <span class="kp-voice-tag">AFTER</span>
                  <p>{{ v.after }}</p>
                </div>
              </div>
            </article>
          </div>
          <blockquote class="kp-voice-quote">
            <p>{{ p.quote }}</p>
            <footer>― {{ p.name }}</footer>
          </blockquote>
        </div>
        <p class="kp-note">※ Mさんの「利用前」は、他のAI録音ツールなどについて話した不満をもとに、場面を想像して書いたものです。</p>
      </div>
    </section>

    <!-- 使い方 -->
    <section id="how" class="kp-section">
      <div class="kp-wrap">
        <p class="kp-label">HOW IT WORKS</p>
        <h2 class="kp-title">とにかくシンプル。使い方に迷いません</h2>
        <ol class="kp-flow">
          <li v-for="(s, i) in steps" :key="s.title" class="kp-flow-item">
            <div class="kp-flow-text">
              <span class="kp-flow-num kp-num">{{ i + 1 }}</span>
              <h3>{{ s.title }}</h3>
              <p>{{ s.body }}</p>
            </div>
            <button type="button" class="kp-flow-imgbtn" :aria-label="`${s.alt}（クリックで拡大）`" @click="zoom = s">
              <img class="kp-flow-img" :src="s.img" :alt="s.alt" loading="lazy" />
              <span class="kp-flow-zoom" aria-hidden="true">🔍 拡大</span>
            </button>
          </li>
        </ol>
        <p class="kp-note">※ 音声そのものの文字起こしは、キキガキでは行いません。文字起こしの済んだテキストをお使いください。</p>
      </div>
    </section>

    <!-- 強み -->
    <section id="strengths" class="kp-section kp-section-tint">
      <div class="kp-wrap">
        <p class="kp-label">STRENGTHS</p>
        <h2 class="kp-title">キキガキの、3つの良いところ</h2>
        <div class="kp-strengths">
          <div v-for="(s, i) in strengths" :key="s.title" class="kp-strength">
            <span class="kp-strength-num kp-num">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 思い -->
    <section id="wish" class="kp-section kp-section-warm">
      <div class="kp-wrap kp-wrap-narrow">
        <p class="kp-label">OUR WISH</p>
        <h2 class="kp-title">自分の言葉を、大事にしてほしい</h2>
        <div class="kp-story">
          <p>
            忙しい毎日の中で、会議も面談も、終わった瞬間に次の予定へ移ります。<br />
            気づけば、あの場で何を話したのか、思い出せないことがほとんどです。
          </p>
          <p>
            でも、記録を残しておくと、<span class="kp-marker">数か月前の会議を読み返して「こんな話をしていたんだ」と驚く</span>ことがあります。<br />
            自分が話した言葉の中に、今の自分を助けるひらめきや気づきが、眠っているのです。
          </p>
          <p>
            自分が話したこと、誰かから聴いたことは、あなたの時間そのものです。<br />
            キキガキは、その時間をきちんと保存して、あとから静かに読み返せるようにする道具です。
          </p>
          <p class="kp-story-end">
            <span class="kp-marker">忙しい毎日の中でも、大切な時間をなかったことにしない。</span><br />
            そのお手伝いをします。
          </p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section id="contact" class="kp-cta">
      <div class="kp-wrap kp-wrap-narrow kp-cta-inner">
        <h2 class="kp-cta-title">まずは、直近の会議をひとつ。</h2>
        <p class="kp-cta-lead">{{ heroNote }}</p>
        <a :href="site.appUrl" class="kp-btn kp-btn-cta kp-btn-lg">
          {{ site.ctaLabel }}
          <span class="kp-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="kp-dev-link kp-dev-link-on-dark"><a :href="site.prototyperUrl" target="_blank" rel="noopener">{{ site.prototyperLabel }} →</a></p>
      </div>
    </section>

    <!-- 画像の拡大表示 -->
    <div v-if="zoom" class="kp-lightbox" role="dialog" aria-modal="true" :aria-label="zoom.alt" @click="zoom = null">
      <button type="button" class="kp-lightbox-close" aria-label="閉じる" @click="zoom = null">×</button>
      <img :src="zoom.img" :alt="zoom.alt" @click.stop />
    </div>

    <footer class="kp-footer">
      <div class="kp-wrap kp-footer-inner">
        <span>© {{ site.serviceName }} ／ {{ site.domain }}</span>
        <a :href="site.appUrl">{{ site.appUrl.replace('https://', '') }}</a>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'kikigaki-promotion' })

const title = 'キキガキ｜あの人との大切な会話を、PDF1枚の記録に'
const description = '会議や面談の文字起こしを貼るだけで、あとから読み返しやすいPDF1枚の記録にまとめます。履歴は一覧で見返せて、Googleドライブに保存すればNotebookLMにも渡せます。'
useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `https://${site.domain}/` },
    // URLを共有したときのサムネイル。画像の元は scripts/og/targets.json（node scripts/og/build.mjs で作り直す）
    { property: 'og:image', content: `https://${site.domain}/og.jpg` },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { name: 'twitter:card', content: 'summary_large_image' },
    ...(site.draft ? [{ name: 'robots', content: 'noindex' }] : []),
  ],
})

// 無料枠の告知。本体の料金・無料枠を変えたら合わせること（apps/production/kikigaki/src/config/service.ts の priceLabel / limits.freeMonthlyBudgetUsd）
const heroNote = '毎月、一定の範囲までは無料。たくさん使いたい方は月額490円（税込）です。'

const isMenuOpen = ref(false)
const zoom = ref<{ img: string, alt: string } | null>(null)
onMounted(() => {
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') zoom.value = null })
})

const navItems = [
  { href: '#for', label: 'こんな方に' },
  { href: '#voice', label: 'お客様の声' },
  { href: '#how', label: '使い方' },
  { href: '#strengths', label: '良いところ' },
  { href: '#wish', label: '思い' },
]

const forList = [
  '議事録づくりに時間を取られたくない',
  'Google Meet・Zoom・音声アプリで文字起こしは出ているのに、そのまま眠っている',
  '会議のあと、「結局なにが決まったんだっけ」となりがち',
  'カウンセリングやコーチングで話した内容を、あとから振り返りたい',
]

const people = [
  {
    name: 'Mさん',
    job: '農家',
    lead: '会議や視察で、各地へ出向くことの多いMさんの場合。使う前と、使ったあとで、会議のあとの時間がこう変わりました。',
    quote: '「共有のしやすさがすごくいい。要約だけなら他のAIでもできる。でも、毎回同じ形にきれいに整って、PDFになって、Googleに自動で残っていく。その手早さと楽さが、キキガキのいいところです」',
    items: [
  {
    scene: '出張先の会議・視察のあとも、貼るだけで整う',
    before: '会議や視察が終わって新幹線に乗ってから、文字起こしやメモをChatGPTに貼って要約。できた文章は並びが見づらく、報告用の書類にするには、結局、自分で整え直していました。',
    after: '終わったら、文字起こしや要点のメモを取り込むだけ。概要・決まったこと・今後の流れ・やることが毎回同じ形で並び、そのまま提出できる見やすい書類になります。',
  },
  {
    scene: '共有はPDFをLINEに貼るだけ',
    before: 'まとめた文章をコピーして、長いメッセージで送っていました。読む側も、どこが大事なのか探すのが大変でした。',
    after: 'A4横1枚のPDFを、そのままLINEに貼るだけ。急ぎの人は左側の「概要」と「決まったこと」、全体を詳しく知りたい人は、右側の「話し合ったこと」を見れば伝わります。',
  },
  {
    scene: '保存先が一か所で、見返しやすい',
    before: '記録のファイルがスマホの中でばらばら。「あの会議、どこに保存したっけ」と探す時間がありました。',
    after: '毎回同じ形で整って、Googleドライブの同じフォルダに自動で保存。数か月前の会議も、すぐ見つかります。',
  },
    ],
  },
  {
    name: 'Uさん',
    job: 'ITエンジニア',
    lead: 'お客様へのヒアリングが多いUさんの場合。記録を読み返す習慣ができて、仕事の進め方が変わりました。',
    quote: '「最近は、昔の議事録を読むのが趣味というか、楽しみになっています。話し合った内容が、宝物のように思えてくるんです」',
    items: [
      {
        scene: '会議・講演の文字起こしを、そのままにしない',
        before: '会議や講演・レクチャーは、別のツールで文字起こしをしても、そのまま置きっぱなし。やりっ放しで、読み返すことはほとんどありませんでした。',
        after: 'その文字起こしをキキガキに貼って、記録に。あとから振り返る習慣ができました。タグで絞り込めば、求める議事録にすぐたどり着けます。',
      },
      {
        scene: 'お客様へのヒアリング',
        before: '何度ヒアリングをしても、結局ニーズが分からない。お客様の手も、何度も煩わせていました。',
        after: '昔の記録を読むと「お客様、こんなことを言っていたんだ」という本当のニーズが見つかります。二度手間がなくなり、ニーズの把握がすごく楽になりました。',
      },
    ],
  },
]

const steps = [
  { title: '文字起こしを貼る', body: '文字起こしのテキストやファイル（txt・Word・PDF）をえらぶか、そのまま貼り付けます。あとは「議事録を作る」を押すだけです。', img: '/images/step1-paste.png', alt: 'テキストを貼り付けて「このテキストから議事録を作る」を押す画面' },
  { title: '一枚にまとまる', body: '決まったこと・やること・話し合った内容が、読みやすい記録になります。内容は自分で直せます。', img: '/images/step2-record.png', alt: '概要・決まったこと・やること・話し合ったことが一枚にまとまった議事録の画面' },
  { title: 'PDFで見る・残す', body: '「PDF」ボタンを押すだけで、A4横1枚のPDFにして保存できます。Googleドライブにも保存できます。', img: '/images/step3-pdf.png', alt: '議事録がA4横1枚のPDFになった様子' },
  { title: '一覧で見返す・タグで絞り込む', body: 'これまでの議事録は日付順の一覧に並びます。タグを付けておけば、ワンタップで絞り込めます。', img: '/images/step4-list.png', alt: 'タグの絞り込みと、日付順に並ぶ議事録の一覧' },
]

const strengths = [
  { title: 'PDF1枚で要点が見える', body: '要点がまとまったPDF1枚に、やること・次の予定・話した内容が収まります。長い会話も、ぱっと見て思い出せます。' },
  { title: '履歴をタグで管理できる', body: 'これまでの記録は一覧で見返せて、タグを付けて整理できます。数か月前の会話にも、すぐ戻れます。' },
  { title: 'Googleのアプリと連携できる', body: 'Googleドライブに保存しておけば、記録が一か所にたまります。さらにNotebookLMなどのGoogleのAIアプリで、Googleドライブにたまった記録を横断して分析したり、問いかけたりもできます。' },
]
</script>
