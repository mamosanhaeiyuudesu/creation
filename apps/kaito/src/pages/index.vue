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

      <!-- はじめての方やこんな方へ -->
      <section id="for-you" class="home-section">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="shell" />はじめての方やこんな方へ</h2>
          <p class="section-lead">
            ひとつでも当てはまるものがあれば、一度お話を聞かせてください。
          </p>

          <ul class="target-list">
            <li>頑張りすぎてしまう方</li>
            <li>人に頼るのが苦手な方</li>
            <li>本当は苦しいのに「大丈夫」と言ってしまう方</li>
            <li>ずっと我慢してきた方</li>
            <li>自分の気持ちより周りを優先してきた方</li>
          </ul>

          <p class="for-you-message">
            私のところへ来られる方は、とても優しい方が多いです。<br />
            周りを大切にする人。<br />
            頑張ることが当たり前になっている人。<br /><br />
            でも、その優しさの中で<br />
            自分の気持ちを後回しにしてしまっている人。<br />
            本当は苦しいのに、「大丈夫」と笑ってしまう人。
          </p>

          <div class="callout-box">
            <h3>無理に変わる必要はありません</h3>
            <p>
              ブロック解放セラピーでは、そんな心の奥にある感情に静かに寄り添います。<br />
              ただ、自分の本当の気持ちを感じることから始まります。<br /><br />
              涙が出ることもあります。<br />
              でもその涙は弱さではなく、<strong>自分自身との再会</strong>なのだと思っています。
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
                ある人から「なおさんらしくやったらいい」と言われたのをきっかけに、型どおりのセラピーではなく、自然体で向き合うかたちに変えてきました。
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

      <!-- 月ノ瀬 直について（配置はページ下部、見た目は about-modest で一段控えめに） -->
      <section id="about" class="home-section about-modest">
        <div class="section-inner">
          <h2><TherapistKaitoIcon name="sun" />月ノ瀬 直について</h2>

          <!-- 見出しを持たない導入。この div があることで、次の about-block に区切り線が入る -->
          <div class="about-intro">
            <p class="hero-quote">「もっと自分らしく生きてもいい」</p>
            <p>
              そう思えるようになるまで、私自身、たくさんの経験をしてきました。
            </p>
            <p>
              人に合わせること。<br />
              我慢して頑張ること。<br />
              人を優先すること。
            </p>
            <p>
              それが当たり前になっていると、いつの間にか自分の気持ちを後回しにしてしまうことがあります。
            </p>
            <p>
              本当は苦しいのに「大丈夫」と言ってしまう。<br />
              悲しくても我慢する。泣けない。<br />
              誰かのために頑張り続ける。
            </p>
            <p>
              私自身も、そんな時間を経験してきました。
            </p>
            <p>
              別居してすぐ、子供から
            </p>
            <p class="hero-quote">「ママってそんなに笑うんや」</p>
            <p>
              と言われ、今まで自分の感情を抑え込むことが<br />
              当たり前になっていた事に気付きました。
            </p>
            <p>
              だからこそ今、私は、<br />
              「自分自身の本当の気持ちに気づき、自分らしく生きていきたい」と願う方に寄り添う仕事をしています。
            </p>
          </div>

          <div class="about-block">
            <h3>私が大切にしているのは「在り方」です</h3>
            <p>
              私は、セラピーで誰かを無理に変えようとは思っていません。<br />
              その人の中には、その人自身が本来持っている可能性や希望、そして愛があると思っているからです。
            </p>
            <p>
              ただ、それらが長い間の我慢や思い込み、恐れ、悲しみなどによって見えなくなっていることがあります。
            </p>
            <p>
              だから私は、その人が安心して自分自身と向き合える場所をつくりたい。<br />
              その人のペースに寄り添いながら、心の奥にあるものを一緒に見つめていきたい。<br />
              そして、その人自身が「本当はどうしたいのか」に気づいていく。
            </p>
            <p>
              そんな時間を大切にしています。
            </p>
          </div>

          <div class="about-block">
            <h3>涙が流れる瞬間</h3>
            <p>
              私がセッションの中で特に心を動かされるのは、クライアントさんが涙を流す瞬間です。<br />
              悲しいからだけではありません。
            </p>
            <p>
              ずっと我慢していたものがほどけたとき。<br />
              誰にも言えなかった気持ちを、初めて自分自身が受け止めたとき。<br />
              「本当は、こんなふうに感じていたんだ」と気づいたとき。
            </p>
            <p>
              安心できる場所で、自分の本当の気持ちに触れたとき、人は自然に涙が流れることがあります。
            </p>
            <p>
              私は、その涙をとても大切にしています。<br />
              自然と起こる身体からの反応。<br />
              浄化のサイン。
            </p>
            <p>
              涙を流したあとに、表情がふっと緩んだり、声が変わったり、穏やかな笑顔が戻ってくる。<br />
              その瞬間に立ち会えることが、私にとって大きな喜びです。
            </p>
          </div>

          <div class="about-block">
            <h3>「愛の通り路」でありたい</h3>
            <p>
              ヒーリングを続ける中で、私自身の感覚も少しずつ変わってきました。
            </p>
            <p>
              最初は、<br />
              「良くなってほしい」<br />
              「何とかしてあげたい」<br />
              という気持ちが強くありました。
            </p>
            <p>
              けれど、経験を重ねる中で、少しずつ、
            </p>
            <p class="hero-quote">結果を握らず、ただ愛のエネルギーを通す。</p>
            <p>
              という感覚になっていきました。
            </p>
            <p>
              ヒーリングをしているとき、私は自分が何かをしているというよりも、ただ静かにそこにいて、愛のエネルギーが通っていく「路」のような感覚になることがあります。
            </p>
            <p>
              それは、穏やかな水面に小石を投げ入れたときに広がる波紋のようです。<br />
              波は静かに広がり、そしてまた戻ってくる。
            </p>
            <p>
              私が相手をコントロールするのではなく、私自身が穏やかに整い、愛の中に在る。<br />
              そこから生まれたものが、必要なところへ届いていく。<br />
              そして、その結果を握らずに委ねる。
            </p>
            <p>
              それが今の私にとってのヒーリングであり、私が大切にしている「在り方」です。
            </p>
          </div>

          <div class="about-block">
            <h3>一人ひとり、その人に合った時間を</h3>
            <p>
              私は、すべての方に同じ方法で向き合うことはしていません。
            </p>
            <p>
              そっと包んでほしい方もいれば、今の自分から一歩踏み出したい方もいます。<br />
              今はただ安心したい方もいれば、人生を本気で変えたいと思っている方もいます。
            </p>
            <p>
              だからこそ、その方の状態やタイミングを感じながら、その人に必要な関わり方を大切にしています。
            </p>
            <p>
              一度のセッションで深くつながることもあります。<br />
              そして、回数を重ねることで信頼が生まれ、最初は触れられなかった、さらに深い部分まで一緒に見ていけることもあります。
            </p>
            <p>
              私は、その「信頼が育っていく時間」も大切にしています。
            </p>
          </div>

          <div class="about-block">
            <h3>本当に変わりたいと思っている方へ</h3>
            <p>
              私が出会いたいのは、<br />
              「誰かに人生を変えてもらいたい」という方ではなく、<br />
              <strong>「自分自身と向き合って、本当に変わりたい」</strong><br />
              と思っている方です。
            </p>
            <p>
              ずっと頑張ってきた方。<br />
              自分のことを後回しにしてきた方。<br />
              本当は苦しいのに、いつも大丈夫なふりをしてしまう方。<br />
              人生の転機を迎え、これからの自分を見つめ直したい方。<br />
              今までの自分から一歩踏み出したい方。<br />
              そして、自分の中にある本当の気持ちや可能性に触れてみたい方。
            </p>
            <p>
              そんな方と、丁寧に向き合っていきたいと思っています。
            </p>
            <p>
              変化を決めるのは、私ではありません。<br />
              その人自身です。
            </p>
            <p>
              私は、その変化のそばにいて、安心して自分自身と向き合える場をつくる。<br />
              必要なときにあなたをそっと包み、必要なときにあなたが一歩前へ進むための力になれる。<br />
              そんな存在でありたいと思っています。
            </p>
          </div>

          <div class="about-block">
            <h3>最後に</h3>
            <p>
              私自身、人生の中でたくさん迷い、悩み、立ち止まってきました。
            </p>
            <p>
              だからこそ、今ここにいる誰かが、
            </p>
            <p class="hero-quote">
              「もう少し自分を大切にしてもいい」<br />
              「本当は、もっと自分らしく生きてもいい」
            </p>
            <p>
              と思えるきっかけをつくれたらと思っています。
            </p>
            <p>
              無理に変わる必要はありません。<br />
              急ぐ必要もありません。
            </p>
            <p>
              ただ、自分の心に静かに耳を傾けてみる。<br />
              そこから始まる変化があります。
            </p>
            <p>
              一人ではなかなか触れることのできなかった感情も、安心して寄り添ってもらえることで、少しずつほどけていくことがあります。
            </p>
            <p>
              そして、ほどけた先に、<br />
              本当の自分。<br />
              自分の中にあった愛。<br />
              忘れていた自分らしさ。
            </p>
            <p>
              そんなものを思い出していくのかもしれません。
            </p>
            <p>
              私は、そんな時間に寄り添う「愛の通り路」でありたいと思っています。
            </p>
            <p class="about-closing">
              ここまで読んでくださって、ありがとうございます。<br />
              必要なタイミングで、必要な方と出会えますように。
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
