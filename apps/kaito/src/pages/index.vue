<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <!-- ヒーロー: ①問いかけ → ②宣言 の2段構成。①の背後に写真を帯として敷く -->
      <section id="top" class="home-hero">
        <div class="hero-inner">
          <!-- ① 問いかけ -->
          <div class="hero-question" :style="{ '--hero-image': `url('${site.images.hero}')` }">
            <h1>本来の自分を思い出す場所</h1>
            <p class="hero-lead">
              誰かに合わせすぎて疲れてしまった心。<br />
              言葉にできないまま抱えてきた想い。<br />
              「こんなこと思ってはいけない」と、自分で自分を責めてきた時間。
            </p>
          </div>

          <!-- ② 宣言 -->
          <div class="hero-statement">
            <p class="hero-statement-main">
              ここではあなたの心の声に寄り添います。<br />
              本当はどんなあなたになりたいですか？
            </p>
          </div>
        </div>
      </section>

      <!-- こんな方へ -->
      <section id="for-you" class="home-section">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="shell" />こんな方へ</h2>
          <p class="section-lead">
            ひとつでも当てはまるものがあれば、一度お話を聞かせてください。
          </p>

          <ul class="target-list">
            <li>職場や家庭の人間関係が、どこにいても頭から離れない</li>
            <li>誰かに合わせているうちに、自分の思いを伝えられなくなった</li>
            <li>怒りや悔しさを、何年も抱えたままになっている</li>
            <li>人の言葉に振り回されて、そのたびに落ち込んでしまう</li>
            <li>がんばっているのに、幸せだと感じられない</li>
            <li>変わりたいと思いながら、何から手をつければいいか分からない</li>
          </ul>

          <div class="callout-box">
            <h3>心の詰まりを、そのままにしていませんか？</h3>
            <p>
              家のトイレが壊れたら、すぐ直しませんか？<br /><br />
              でも心はフタをして、みないようにしてしまいがちです。<br />
              その心の違和感に気がついているなら、<strong>今が動くとき</strong>です。
            </p>
          </div>
        </div>
      </section>

      <!-- セラピーのスタイル -->
      <section id="style" class="home-section message">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="wave" />セラピーのスタイル</h2>
          <p class="section-lead">
            どんな距離で向き合っているか、先にお伝えしておきます。
          </p>

          <div class="style-list">
            <article class="style-card has-photo">
              <figure class="style-photo">
                <TherapistKaitoScene name="talk" />
              </figure>
              <div class="style-body">
              <h3>気軽にお話ししましょう</h3>
              <p>
                「セラピー」という言葉は、少し重たく聞こえるかもしれません。<br />
                実際はもっと軽やかなもので、「お悩みアドバイザー」くらいの気持ちで来ていただけたらと思っています。
              </p>
              <p>
                FLSを学んだ講座の先生から「なおさんらしくやったらいい」と言われたのをきっかけに、型どおりのセラピーではなく、自然体で向き合うかたちに変えてきました。
              </p>
              </div>
            </article>

            <article class="style-card has-photo is-photo-right">
              <figure class="style-photo">
                <TherapistKaitoScene name="shine" />
              </figure>
              <div class="style-body">
              <h3>可能性のない人なんて、いない</h3>
              <p>
                ご自身では気づいていない可能性が、必ずどこかにあります。<br />
                対話のなかでそれに気づいてもらえた瞬間が、私にとっていちばん嬉しい時間です。
              </p>
              <p>
                隣で一緒に考えることはできますが、歩き出すのはいつもあなた自身です。
              </p>
              <p>
                今この瞬間を、より心地よく過ごせるように。終わったあとに「自分で決められた」という感覚が残る関わり方を大切にしています。
              </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- セラピーの内容 -->
      <section id="services" class="home-section glow">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="hibiscus" />セラピーの内容</h2>
          <p class="section-lead">
            2つのメニューがあります。迷われたら、ご相談いただければご提案します。
          </p>

          <div class="service-block">
            <h3>おしゃべりカウンセリング</h3>

            <h4>どんなことをするのか</h4>
            <p>
              まず、今困っていることをお聞きします。うまく話せなくても、考えがまとまっていなくても大丈夫です。
            </p>
            <p>
              話しているうちに、ご自身でも意識していなかった感情が出てくることがあります。<br />
              「私、こんなこと思ってたんだ」——その気づきが起点になります。
            </p>
            <p>
              そこから、その感情がどこから来ているのかを一緒にたどり、今あなたが本当に望んでいる方向へ焦点を合わせていきます。自分の言葉が、自分に刺さる瞬間があります。
            </p>
            <p class="term-note">
              潜在意識にはたらきかける手法（FLS）をベースにしていますが、難しい言葉は使いません。やっているのは、上に書いたとおりの時間です。
            </p>

            <h4>当日の流れ</h4>
            <ul class="flow-list">
              <li>
                <span class="flow-label">初回 2時間</span>
                今の状況をお聞きする → セラピー → 潜在意識についての説明と、これからの進め方のご相談
              </li>
              <li>
                <span class="flow-label">2回目以降 1時間</span>
                前回からの変化を伺い、その日のテーマに合わせて進めます
              </li>
            </ul>

            <h4>受ける前に知っておいていただきたいこと</h4>
            <ul class="flow-list">
              <li>対面・オンライン（Zoom等）のどちらでも受けていただけます</li>
              <li>話したくないことを無理に聞き出すことはありません</li>
              <li>涙が出る方は多いですが、引き出しているのではなく、ご自身のペースで出てきたものです</li>
            </ul>

            <h4>料金</h4>
            <table class="pricing-table">
              <thead>
                <tr>
                  <th scope="col">プラン</th>
                  <th scope="col">料金（税込）</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>単発</td><td>30,000円/回</td></tr>
                <tr><td>5回コース（3ヶ月）</td><td>110,000円</td></tr>
                <tr><td>15回コース（9ヶ月）</td><td>240,000円</td></tr>
              </tbody>
            </table>
            <p class="note-text">
              まずは単発で試して、ご自身に合うか確かめていただいて構いません。コースがあるのは、一度の気づきで終わらせず、日常に戻ったあとの揺り戻しまで一緒に見ていくためです。
            </p>
          </div>

          <div class="service-block service-block--compact">
            <h3>レムリアンヒーリング</h3>
            <p class="compact-lead">
              横になって受けていただきます。こちらから何かを話していただく必要はありません。
            </p>

            <details class="detail-disclosure">
              <summary>くわしい内容と料金を見る</summary>
              <div class="detail-body">
                <p>
                  受けている間に、イメージが浮かぶ方、メッセージを受け取る方、前世の記憶のようなものを思い出す方、身体の不調がやわらぐ方がいらっしゃいます。何も感じない方もいます。<br />
                  終わったあと、私が受け取ったメッセージやビジョンをお伝えします。
                </p>
                <p>
                  おしゃべりカウンセリングが「話して気づく」時間だとすれば、こちらは「委ねて受け取る」時間です。<br />
                  気づきを得たい方にはおしゃべりカウンセリングを、まず休みたい・ゆるめたいという方にはこちらをおすすめしています。
                </p>

                <h4>料金</h4>

                <table class="pricing-table">
                  <thead>
                    <tr>
                      <th scope="col">メニュー</th>
                      <th scope="col">料金（税込）</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>レムリアンヒーリング（1回）</td><td>15,000円</td></tr>
                    <tr><td>レムリアン女神ヒーリングアクティベーション講座（全6回）</td><td>150,000円</td></tr>
                  </tbody>
                </table>

                <div class="callout-box">
                  <h3>アクティベーション講座について</h3>
                  <p>
                    ご自身でヒーリングができるようになる講座です。<br />
                    お知り合いと一緒に受講する割引もあります。一緒に学ぶと練習し合えます。
                  </p>
                </div>
              </div>
            </details>
          </div>

          <div class="service-block service-block--compact">
            <h3>各種割引</h3>
            <p class="compact-lead">知り合い価格・紹介価格・グループ受講割引があります。詳しくはお問い合わせください。</p>
          </div>
        </div>
      </section>

      <!-- お客様の声 -->
      <section id="testimonials" class="home-section">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="starfish" />お客様の声</h2>
          <p class="section-lead">
            感じ方は一人ひとり違いますが、変化のヒントとしてご覧ください。
          </p>

          <div class="testimonial-list">
            <article class="testimonial-card">
              <h3 class="testimonial-name">
                <TherapistKaitoAvatar :variant="1" />
                <span>おしゃべりカウンセリング・継続中の方</span>
              </h3>
              <p>
                「すごい深い愛を感じました。<br />
                セラピーを続けられなくなるくらい涙が出てしまって。<br />
                でも、それが自分に必要な時間だったと思います。」
              </p>
            </article>

            <article class="testimonial-card">
              <h3 class="testimonial-name">
                <TherapistKaitoAvatar :variant="2" />
                <span>おしゃべりカウンセリングを受けられた方</span>
              </h3>
              <p>
                「エネルギーが循環しているような感覚があります。<br />
                自分が何かをするというより、日々気づいていく感覚に近いです。」
              </p>
            </article>

            <article class="testimonial-card">
              <h3 class="testimonial-name">
                <TherapistKaitoAvatar :variant="3" />
                <span>おしゃべりカウンセリング・50代女性</span>
              </h3>
              <p>
                「人に振り回されることが多かったのですが、重ねるうちに自分の軸ができてきました。以前なら感情的になっていた場面でも、冷静でいられます。」
              </p>
            </article>

            <article class="testimonial-card">
              <h3 class="testimonial-name">
                <TherapistKaitoAvatar :variant="4" />
                <span>レムリアンヒーリング・40代女性</span>
              </h3>
              <p>
                「海の中を泳いでいるようなイメージが浮かびました。終わった後は体全体がポカポカして、とても穏やかな気持ちになりました。」
              </p>
            </article>
          </div>

          <p class="note-text">
            ※ 感想は個人の体験であり、すべての方に同じ変化を保証するものではありません。
          </p>
        </div>
      </section>

      <!-- よくある質問 -->
      <section id="faq" class="home-section">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="fish" />よくある質問</h2>

          <div class="faq-list">
            <div class="faq-item">
              <h3>Q. どんな服装で行けばいいですか？</h3>
              <p>
                リラックスできる服装であれば大丈夫です。ヒーリングの際は横になることもありますので、締め付けの少ない楽な服装がおすすめです。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. 話した内容は秘密にしてもらえますか？</h3>
              <p>
                はい、お話しいただいた内容は厳守します。安心してお話しください。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. まず1回だけ受けてみることはできますか？</h3>
              <p>
                できます。単発でお試しいただき、合いそうだと感じられたらコースをご検討ください。無理におすすめすることはありません。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. 支払い方法とキャンセルについて教えてください</h3>
              <p>
                銀行振込、または各種キャッシュレス決済に対応しています。日程変更・キャンセルはセラピー当日の3日前までにご連絡ください。3日前を過ぎるとキャンセル料が発生する場合があります。
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- 月ノ瀬 直について（本文は原文のまま。配置だけページ下部へ、見た目は about-modest で一段控えめに） -->
      <section id="about" class="home-section about-modest">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="sun" />月ノ瀬 直について</h2>

          <div class="about-block">
            <h3>「ママってそんなに笑うんやね」</h3>
            <p>
              かつて私は、家の中で自分の感情を出すことができませんでした。<br />
              声をあげて笑うことさえ、抑え込むのが当たり前になっていた時期があります。<br />
              それでも、自分の中で「笑える時間」だけは意識してつくり続けていました。
            </p>
            <p>
              環境が変わってしばらく経ったある日、子どもがふとこう言いました。
            </p>
            <p class="hero-quote">「ママってそんなに笑うんやね」</p>
            <p>
              その一言で、自分らしく生きるという選択は間違っていなかったと、はっきり分かりました。<br />
              表現することを諦めてきた方の気持ちが分かるのは、この経験があるからです。
            </p>
            <p>
              子供のキラキラした笑顔のまま大人になってほしい、と思っています。
            </p>
          </div>

          <div class="about-block">
            <h3>この道を選ぶまで</h3>
            <p>
              セラピストを志したのは、離婚を決意した頃でした。病気の疑いもあり、自分の人生について深く考えるなかで、龍神様との出会いがありました。「人の役に立ちたい」という想いが強くなり、メンターとの出会いを経て、この道を歩き始めています。
            </p>
            <p>鑑定で、私の役割についてこう言われたことがあります。</p>
            <div class="callout-box">
              <p>言葉にならない想いを、代わりに表していく使命。</p>
            </div>
            <p>
              「私をあなたの心の翻訳器として使ってください」とお伝えしているのは、そういう意味です。<br />
              どんな気持ちも、どんな過去も、ここでは安全です。
            </p>
          </div>

          <div class="about-block">
            <h3>大切にしていること</h3>
            <ul class="episode-list">
              <li><strong>話しやすさ・安心感</strong> — 初めての方でも構えずに話せる雰囲気を大切にしています</li>
              <li><strong>ジャッジしないこと</strong> — どんな想いも否定せず、そのまま受け取ります</li>
            </ul>
            <p class="block-note">
              30年前にジェンダーを打ち明けられたこともあります。<br />
              どんな話でも、安心してお聞かせください。
            </p>
          </div>
        </div>
      </section>

      <!-- できないことの明示。断り書きではなく前提の共有なので、ページ下部に控えめに置く -->
      <section id="limits" class="home-section limits-section">
        <div class="limits-box">
          <h3><TherapistKaitoIcon name="ring" />このセラピーでできないこと</h3>
          <ul>
            <li>医療行為ではありません。病気の診断や治療の代わりにはなりませんので、通院中の方は主治医にご相談ください。</li>
            <li>誰か他の人を変える方法はお伝えできません。扱うのは、あなた自身の心だけです。</li>
            <li>一度で人生が変わる、という約束もしていません。あなたのペースで、少しずつ進みます。</li>
          </ul>
        </div>
      </section>

      <!-- お問い合わせ -->
      <section id="contact" class="home-cta">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="palm" />お問い合わせ</h2>
          <p>
            「これって私に合うのかな」という段階で大丈夫です。<br />
            どちらのメニューが良いか迷われている場合も、まずはご相談ください。
          </p>
          <!-- フォームURLが未設定の間はボタンを出さない（リンク切れを作らないため） -->
          <div v-if="site.contactFormUrl" class="contact-actions">
            <a
              class="cta-link"
              :href="site.contactFormUrl"
              target="_blank"
              rel="noopener noreferrer"
            >お問い合わせフォームへ</a>
          </div>
        </div>
      </section>
    </main>

    <TherapistKaitoFooter />
  </div>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

definePageMeta({ layout: 'therapist' })

useHead({
  bodyAttrs: { class: 'home' },
  title: '月ノ瀬 直 | 本来の自分を思い出す場所',
  meta: [
    { name: 'description', content: '本来の自分を思い出す場所。おしゃべりカウンセリングとレムリアンヒーリングで、あなたの心の声に寄り添います。セラピスト 月ノ瀬 直。' },
    { property: 'og:title', content: '月ノ瀬 直 | 本来の自分を思い出す場所' },
    { property: 'og:description', content: 'フタをしてしまった想いや感情を解放し、本来の自分を思い出すお手伝いをします。' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌊</text></svg>` },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Zen+Maru+Gothic:wght@300;400;500&family=Noto+Sans+JP:wght@300;400;500;600&display=swap',
    },
  ],
})
</script>

<style>
@import '~/assets/css/kaito.css';
</style>
