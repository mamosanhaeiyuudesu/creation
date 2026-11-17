<template>
  <div class="kp-page">
    <div v-if="site.draft" class="kp-draft">下書き（たたき）です。文言・構成は仮のものです</div>

    <header class="kp-header">
      <div class="kp-wrap kp-header-inner">
        <a href="#top" class="kp-logo">
          <span class="kp-logo-mark" aria-hidden="true">📒</span>
          <span class="kp-logo-name">{{ site.serviceName }}</span>
        </a>
        <a :href="site.appUrl" class="kp-btn kp-btn-cta kp-header-cta">{{ site.ctaLabel }}</a>
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
          あとから読み返しやすい「一枚の記録」にまとまります。
        </p>
        <a :href="site.appUrl" class="kp-btn kp-btn-cta kp-btn-lg">
          {{ site.ctaLabel }}
          <span class="kp-btn-arrow" aria-hidden="true">→</span>
        </a>
        <p class="kp-hero-note">{{ heroNote }}</p>
      </div>
    </section>

    <!-- 忘れる -->
    <section class="kp-section">
      <div class="kp-wrap kp-wrap-narrow">
        <p class="kp-label">REMEMBER</p>
        <h2 class="kp-title">話したことの多くは、思っているより早く消えていきます</h2>
        <div class="kp-story">
          <p>
            忙しい毎日の中で、会議も面談も、終わった瞬間に次の予定へ移ります。<br />
            気づけば、あの場で何を話したのか、思い出せないことがほとんどです。
          </p>
          <p>
            でも、記録を残しておくと、<span class="kp-marker">3か月前の会議を読み返して「こんな話をしていたんだ」と驚く</span>ことがあります。<br />
            自分が話した言葉の中に、今の自分を助けるひらめきや気づきが、眠っているのです。
          </p>
        </div>
      </div>
    </section>

    <!-- こんな方に -->
    <section class="kp-section kp-section-tint">
      <div class="kp-wrap">
        <p class="kp-label">FOR YOU</p>
        <h2 class="kp-title">こんな方に</h2>
        <ul class="kp-for-grid">
          <li v-for="f in forList" :key="f" class="kp-for">{{ f }}</li>
        </ul>
      </div>
    </section>

    <!-- 使い方 -->
    <section id="how" class="kp-section">
      <div class="kp-wrap">
        <p class="kp-label">HOW IT WORKS</p>
        <h2 class="kp-title">使い方は、貼って、待つだけ</h2>
        <ol class="kp-flow">
          <li v-for="(s, i) in steps" :key="s.title" class="kp-flow-item">
            <span class="kp-flow-num kp-num">{{ i + 1 }}</span>
            <h3>{{ s.title }}</h3>
            <p>{{ s.body }}</p>
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

    <!-- 読み返す -->
    <section class="kp-section">
      <div class="kp-wrap kp-wrap-narrow">
        <p class="kp-label">RE-READ</p>
        <h2 class="kp-title">受けて終わりにしない。何度も読み返して、深める</h2>
        <p class="kp-lead">会議・打ち合わせ・面談・感想・カウンセリングやコーチング。どんな会話も、記録があれば、あとから何度でも味わい直せます。</p>
        <ul class="kp-scenes">
          <li v-for="s in scenes" :key="s.title" class="kp-scene">
            <h4>{{ s.title }}</h4>
            <p>{{ s.body }}</p>
          </li>
        </ul>
      </div>
    </section>

    <!-- 思い -->
    <section class="kp-section kp-section-warm">
      <div class="kp-wrap kp-wrap-narrow">
        <p class="kp-label">OUR WISH</p>
        <h2 class="kp-title">自分の言葉を、大事にしてほしい</h2>
        <div class="kp-story">
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
      </div>
    </section>

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

const title = 'キキガキ｜あの人との大切な会話を、一枚の記録に'
const description = '会議や面談の文字起こしを貼るだけで、あとから読み返しやすい一枚の記録にまとめます。履歴は一覧で見返せて、Googleドライブに保存すればNotebookLMにも渡せます。'
useHead({
  title,
  meta: [
    { name: 'description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: `https://${site.domain}/` },
    { name: 'twitter:card', content: 'summary' },
    ...(site.draft ? [{ name: 'robots', content: 'noindex' }] : []),
  ],
})

// モニター期間中の無料告知は、有料化の切り替えに合わせて見直すこと（apps/production/kikigaki/src/config/service.ts の monitorMode）
const heroNote = '今はモニター期間として、無料でお使いいただけます。'

const forList = [
  'Google Meet・Zoom・音声アプリで文字起こしは出ているのに、そのまま眠っている',
  '会議のあと、「結局なにが決まったんだっけ」となりがち',
  '自分が話したこと、聴いたことを、もっと大事にしたい',
  'カウンセリングやコーチングを、受けて終わりにしたくない',
  '議事録づくりに時間を取られたくない',
]

const steps = [
  { title: '文字起こしを貼る', body: '文字起こしのテキストやファイル（txt・Word・PDF）をえらぶか、そのまま貼り付けます。' },
  { title: '一枚にまとまる', body: '決まったこと・やること・話し合った内容が、読みやすい一枚の記録になります。ブラウザを閉じても、裏で作り続けます。' },
  { title: '見返す・残す', body: '内容は自分で直せます。PDFでダウンロードしたり、Googleドライブに保存したりできます。' },
]

const strengths = [
  { title: '一枚で、全体が見える', body: '決まったこと、やること、話し合った内容が一枚に収まります。長い会話も、ぱっと見て思い出せます。' },
  { title: '履歴を、一覧で見返せる', body: 'これまでの記録が日付順に並びます。3か月前、半年前の会話にも、すぐ戻れます。' },
  { title: 'ドライブからNotebookLMへ', body: 'Googleドライブに保存しておけば、NotebookLMへの共有もかんたん。たまった記録を横断して、問いかけられます。' },
]

const scenes = [
  { title: '会議・打ち合わせ', body: '決まったことと次のやることを、あとから確認できます。' },
  { title: '面談・インタビュー', body: '相手の言葉を、そのままの温度で残せます。' },
  { title: 'カウンセリング・コーチング', body: '受けて終わりではなく、何度も読み返して、気づきを深められます。' },
  { title: '感想・ふりかえり', body: 'そのときの自分の気持ちを、あとから見つけられます。' },
]
</script>
