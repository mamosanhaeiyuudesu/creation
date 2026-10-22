<template>
  <div class="k2">
    <K2Header />

    <main>
      <!-- ヒーロー: まず「何が得られるか」。kaito の語り（プロフィール・在り方）の要点はここの3つの価値に集約した -->
      <section id="top" class="k2-hero">
        <div class="k2-wrap k2-hero-inner">
          <div class="k2-hero-text">
            <p class="k2-hero-label">カウンセリング ＆ ヒーリング ／ 60分</p>
            <h1 class="k2-hero-title">
              <span>話すだけで、</span><span>心が軽くなる。</span>
            </h1>
            <p class="k2-hero-lead">
              <span>頑張りすぎて、自分の気持ちが後回しの方へ。</span><br />
              <span>考えがまとまっていなくても大丈夫です。</span><span>「大丈夫」と言ってきたあなたが、</span><span>本来の自分に還る場所です。</span>
            </p>

            <p class="k2-hero-sub">ここで得られること</p>
            <ul class="k2-hero-values">
              <li v-for="v in heroValues" :key="v.title">
                <K2Icon :name="v.icon" />
                <div>
                  <strong>{{ v.title }}</strong>
                  <span>{{ v.body }}</span>
                </div>
              </li>
            </ul>

            <ul class="k2-chips" aria-label="受けやすさ">
              <li v-for="c in chips" :key="c">{{ c }}</li>
            </ul>

            <div class="k2-hero-cta">
              <a
                class="k2-btn k2-btn-accent k2-btn-lg"
                :href="site.applyFormUrl || '#contact'"
                :target="site.applyFormUrl ? '_blank' : undefined"
                :rel="site.applyFormUrl ? 'noopener noreferrer' : undefined"
              >初回 {{ site.price.monitor }} で受けてみる</a>
              <a class="k2-btn k2-btn-ghost k2-btn-lg" href="#menu">自分に合うメニューを見る</a>
            </div>
          </div>

          <figure class="k2-hero-photo">
            <img :src="site.images.hero" alt="愛猫を抱いてほほえむ月ノ瀬 直" width="1000" height="896" />
            <figcaption>セラピスト　月ノ瀬 直</figcaption>
          </figure>
        </div>
      </section>

      <!-- 受けたあとの変化: 実際の声の言葉をヒーロー直下に引用 -->
      <section class="k2-quotes" aria-label="受けた方の声から">
        <div class="k2-wrap">
          <ul>
            <li v-for="q in quotes" :key="q">{{ q }}</li>
          </ul>
        </div>
      </section>

      <!-- メニュー・料金: 料金は基本の単発のみ。継続コース・特典は問い合わせで案内 -->
      <section id="menu" class="k2-section">
        <div class="k2-wrap">
          <p class="k2-label">MENU</p>
          <h2 class="k2-title">メニュー・料金</h2>
          <p class="k2-lead">迷われたら、ご相談いただければご提案します。</p>

          <div class="k2-choose">
            <p class="k2-choose-head">あなたに合うのは？</p>
            <ul>
              <li v-for="c in choose" :key="c.menu">
                <span class="k2-choose-when">{{ c.when }}</span>
                <span class="k2-choose-arrow" aria-hidden="true">→</span>
                <strong>{{ c.menu }}</strong>
              </li>
            </ul>
          </div>

          <div class="k2-grid-3">
            <article v-for="m in menus" :key="m.title" class="k2-card k2-menu">
              <span class="k2-tag k2-tag-main">{{ m.tag }}</span>
              <h3>{{ m.title }}</h3>
              <p class="k2-menu-catch">{{ m.catch }}</p>
              <ul class="k2-dot-list">
                <li v-for="item in m.items" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>

          <div class="k2-price">
            <p class="k2-price-head">料金（どのメニューも共通・税込）</p>
            <div class="k2-price-row">
              <div class="k2-price-item k2-price-item-hl">
                <span class="k2-price-label">初回モニター価格</span>
                <span class="k2-price-num">{{ site.price.monitor }}</span>
              </div>
              <div class="k2-price-item">
                <span class="k2-price-label">キャンペーン価格（{{ site.price.minutes }}）</span>
                <span class="k2-price-num">{{ site.price.campaign }}</span>
                <s class="k2-price-regular">通常 {{ site.price.regular }}</s>
              </div>
            </div>
            <p class="k2-price-note">継続コースもあります（継続中は、セッション後の質問にLINEでお答えする特典つき）。詳しくはお問い合わせください。</p>
          </div>
        </div>
      </section>

      <!-- こんな方へ: data-vis の「こんなデータ、眠っていませんか」と同じ横並びカード -->
      <section id="for-you" class="k2-section">
        <div class="k2-wrap">
          <p class="k2-label">FOR YOU</p>
          <h2 class="k2-title">はじめての方、こんな方へ</h2>
          <p class="k2-lead">ひとつでも当てはまれば、一度お話を聞かせてください。</p>

          <div class="k2-grid-3">
            <div v-for="w in worries" :key="w.title" class="k2-card k2-worry">
              <span class="k2-tag">{{ w.tag }}</span>
              <h3>{{ w.title }}</h3>
              <ul class="k2-dot-list">
                <li v-for="item in w.items" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>

          <p class="k2-note-center"><strong>無理に変わる必要はありません。</strong>本当の気持ちを感じることから始めます。</p>
        </div>
      </section>

      <!-- 大切にしていること: 旧「セラピーのスタイル」と「在り方」の要点 -->
      <section id="style" class="k2-section k2-section-tint">
        <div class="k2-wrap">
          <p class="k2-label">STYLE</p>
          <h2 class="k2-title">大切にしていること</h2>

          <div class="k2-grid-3">
            <div v-for="p in policies" :key="p.title" class="k2-card k2-policy">
              <span class="k2-policy-num">{{ p.num }}</span>
              <h3>{{ p.title }}</h3>
              <p>{{ p.body }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- お客様の声: 短いものは除き3人。見出し＋要点に絞る -->
      <section id="voices" class="k2-section k2-section-tint">
        <div class="k2-wrap">
          <p class="k2-label">VOICE</p>
          <h2 class="k2-title">お客様の声</h2>

          <div class="k2-grid-3">
            <article v-for="v in voices" :key="v.who" class="k2-card k2-voice">
              <div class="k2-voice-head">
                <K2Avatar :variant="v.avatar" />
                <div>
                  <span class="k2-tag k2-tag-main">{{ v.menu }}</span>
                  <p class="k2-voice-who">{{ v.who }}</p>
                </div>
              </div>
              <h3>{{ v.title }}</h3>
              <ul class="k2-dot-list">
                <li v-for="item in v.points" :key="item">{{ item }}</li>
              </ul>
            </article>
          </div>

          <p class="k2-small">※ 感想は個人の体験であり、すべての方に同じ変化を保証するものではありません。</p>
        </div>
      </section>

      <!-- プロフィール: kaito の長い語りを見出し4つ・各2〜3行に絞った -->
      <section id="about" class="k2-section">
        <div class="k2-wrap k2-wrap-narrow">
          <p class="k2-label">PROFILE</p>
          <h2 class="k2-title">月ノ瀬 直について</h2>

          <div class="k2-about">
            <div v-for="a in about" :key="a.title" class="k2-about-block">
              <h3>{{ a.title }}</h3>
              <p v-if="a.quote" class="k2-quote">{{ a.quote }}</p>
              <p>{{ a.body }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- よくある質問 -->
      <section id="faq" class="k2-section k2-section-tint">
        <div class="k2-wrap k2-wrap-narrow">
          <p class="k2-label">FAQ</p>
          <h2 class="k2-title">よくある質問</h2>

          <div class="k2-faq">
            <details v-for="f in faqs" :key="f.q" class="k2-faq-item">
              <summary>{{ f.q }}</summary>
              <p>{{ f.a }}</p>
            </details>
          </div>

          <!-- できないことの明示。断り書きではなく前提の共有として控えめに置く -->
          <div class="k2-limits">
            <h3><K2Icon name="ring" />このセラピーでできないこと</h3>
            <ul>
              <li>医療行為ではありません。病気の診断・治療の代わりにはならず、完治を保証するものではありません。</li>
              <li>誰か他の人を変える方法はお伝えできません。扱うのは、あなた自身の心だけです。</li>
              <li>一度で人生が変わる、という約束はできません。あなたのペースで進みます。</li>
            </ul>
          </div>
        </div>
      </section>

      <!-- お問い合わせ -->
      <section id="contact" class="k2-cta">
        <div class="k2-wrap">
          <h2 class="k2-cta-title">まずは、お話ししてみませんか？</h2>
          <p>「私に合うのかな」という段階で大丈夫です。<br class="k2-pc" />どのメニューにするか迷っている方も、お気軽にどうぞ。</p>
          <div v-if="site.contactFormUrl || site.applyFormUrl" class="k2-cta-actions">
            <a
              v-if="site.applyFormUrl"
              class="k2-btn k2-btn-accent k2-btn-lg"
              :href="site.applyFormUrl"
              target="_blank"
              rel="noopener noreferrer"
            >お申し込みフォームへ</a>
            <a
              v-if="site.contactFormUrl"
              class="k2-btn k2-btn-white k2-btn-lg"
              :href="site.contactFormUrl"
              target="_blank"
              rel="noopener noreferrer"
            >お問い合わせフォームへ</a>
          </div>
        </div>
      </section>
    </main>

    <K2Footer />
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

const heroValues = [
  { icon: 'shell', title: '気持ちが整理される', body: 'もやもやを話すうちに、「私、こんなこと思ってたんだ」と本音が見えてきます。' },
  { icon: 'wave', title: 'くり返す悩みの根っこに触れる', body: '我慢や思い込みをほどき、同じ悩みをくり返しにくくなる方もいます。' },
  { icon: 'sun', title: '心と身体がゆるむ', body: '横になって受けるだけ。終わったあと、受け取ったメッセージやビジョンをお伝えします。' },
] as const

const chips = ['60分', '初回モニター 5,000円', '1回だけでもOK', '秘密厳守']

const quotes = [
  '「翌朝には、前日より気持ちが楽になっていました」',
  '「今は心も身体も軽くスッキリしています」',
  '「肩の力が抜けて、価値観が書き変わってきているのを感じます」',
]

const choose = [
  { when: '誰かに話して整理したい', menu: 'おしゃべりカウンセリング' },
  { when: '同じ悩みや人間関係をくり返す', menu: 'ブロック解放セラピー' },
  { when: '話す元気もない、まず休みたい', menu: 'ヒーリング' },
]

const worries = [
  {
    tag: '頑張りすぎる',
    title: 'つい、頑張りすぎてしまう',
    items: ['頑張ることが当たり前になっている', '人に頼るのが苦手'],
  },
  {
    tag: '我慢してきた',
    title: '苦しいのに「大丈夫」と言ってしまう',
    items: ['悲しくても我慢して、泣けない', 'ずっと気持ちにフタをしてきた'],
  },
  {
    tag: '自分を後回し',
    title: '周りを優先して、自分がわからない',
    items: ['自分の気持ちより周りを優先してきた', '人生の転機に、自分を見つめ直したい'],
  },
]

const policies = [
  {
    num: '01',
    title: '気軽に話せる距離で',
    body: '型どおりのセラピーではなく自然体で。「お悩みアドバイザー」くらいの気持ちで来てください。',
  },
  {
    num: '02',
    title: '可能性のない人はいない',
    body: '誰の中にも、まだ気づいていない可能性や愛があります。それを一緒に見つけます。',
  },
  {
    num: '03',
    title: '変化を決めるのは、あなた',
    body: '無理に変えようとはしません。あなたのペースに寄り添い、一歩を踏み出す力になります。',
  },
]

const menus = [
  {
    tag: '話して気づく',
    title: 'おしゃべりカウンセリング',
    catch: 'まずは、吐き出すことから。',
    items: ['うまく話せなくても大丈夫', '「私、こんなこと思ってたんだ」という気づきが起点に'],
  },
  {
    tag: '思い込みをほどく',
    title: 'ブロック解放セラピー',
    catch: '繰り返す悩みの根っこにアプローチ。',
    items: ['潜在意識にある無自覚な思い込みをリセット', '幼い頃からの古い価値観をアップデート'],
  },
  {
    tag: '委ねて受け取る',
    title: 'レムリアン / クリスタルヒーリング',
    catch: 'まず休みたい・ゆるめたい方に。',
    items: ['横になってリラックスして受けられます', '終わったあと、受け取ったメッセージやビジョンをお伝えします'],
  },
]

const voices: { avatar: 1 | 2 | 3 | 4 | 5 | 6; menu: string; who: string; title: string; points: string[] }[] = [
  {
    avatar: 2,
    menu: 'ブロック解放セラピー',
    who: '京都市在住・50代女性',
    title: '「本来の私」が見つかって、心も身体も軽く',
    points: [
      'さっきまでの感情が思い出せなくなり「何これー!?」と驚いた',
      '想いを整理してもらい、安心とワクワクが同時に湧いてきた',
    ],
  },
  {
    avatar: 3,
    menu: 'レムリアンヒーリング',
    who: '長野県在住・50代女性 Mさん',
    title: '眠って目覚めたら、頭の中まで軽くなっていた',
    points: [
      '翌朝には、前日より気持ちが楽になっていた',
      '伝えてもらった森の景色を思い浮かべると、今も楽になる',
    ],
  },
  {
    avatar: 4,
    menu: 'ブロック解放セラピー',
    who: '埼玉県在住・50代 Jさん',
    title: '安心して、ありのままを話せる場所',
    points: [
      '拒絶されている感じがまったくなく、ちゃんと聴いてもらえた',
      '静かに秘めた「人を助けたい」想いが伝わってくる方',
    ],
  },
]

const about = [
  {
    title: '「ママってそんなに笑うんや」',
    quote: '',
    body: '別居してすぐ、子どもに言われたひと言で、自分の感情を抑え込むのが当たり前になっていたと気づきました。だからこそ今、本当の気持ちに気づき、自分らしく生きたいと願う方に寄り添っています。',
  },
  {
    title: '涙は、自分自身との再会',
    quote: '',
    body: 'ずっと我慢していたものがほどけたとき、人は自然と涙が流れます。そのあと表情がふっと緩み、笑顔が戻る瞬間に立ち会えることが、私の大きな喜びです。',
  },
  {
    title: '「愛の通り路」でありたい',
    quote: '結果を握らず、ただ愛のエネルギーを通す。',
    body: '相手をコントロールするのではなく、私自身が穏やかに整い、必要なものが必要なところへ届いていく。それが私の大切にしている在り方です。',
  },
  {
    title: '本当に変わりたいと思っている方へ',
    quote: '',
    body: '一人ひとりの状態やタイミングに合わせて関わり方を変えています。そっと包んでほしいときも、一歩踏み出したいときも、そばで支えます。',
  },
]

const faqs = [
  { q: '話した内容は秘密にしてもらえますか？', a: 'はい、もちろんです。お話しいただいた内容は厳守します。' },
  { q: 'まず1回だけ受けてみることはできますか？', a: 'はい、できます。単発でお試しいただき、合いそうならまたご予約ください。無理におすすめすることはありません。' },
  { q: 'ヒーリングはどんな格好で受けたらいいですか？', a: '横になって受けることをおすすめしているので、締め付けの少ない楽な服装がおすすめです。' },
  { q: '支払い方法とキャンセルについて教えてください', a: '銀行振込・各種キャッシュレス決済に対応しています。日程変更・キャンセルはセラピー当日の3日前までにご連絡ください。' },
]

useHead({
  title: '月ノ瀬 直 | 本来のあなたに還る場所',
  meta: [
    { name: 'description', content: '頑張りすぎて後回しにしてきた気持ちを、安心できる場所でほどいていく。おしゃべりカウンセリング・ブロック解放セラピー・ヒーリング。セラピスト 月ノ瀬 直。' },
    { property: 'og:title', content: '月ノ瀬 直 | 本来のあなたに還る場所' },
    { property: 'og:description', content: '「大丈夫」と言ってきたあなたが、本来の自分に還る場所。' },
    { property: 'og:url', content: site.url },
    { property: 'og:image', content: `${site.url}${site.images.hero}` },
  ],
})
</script>

<style>
@import '~/assets/css/kaito2.css';
</style>
