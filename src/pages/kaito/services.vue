<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <article class="page-wrapper">
        <header class="page-header">
          <h1>サービス内容</h1>
          <p>
            本来の自分を思い出すためのセッションをご用意しています。<br />
            あなたのペースに合わせて、一緒に歩んでいきましょう。
          </p>
        </header>

        <div class="page-content">
          <section class="profile-section">
            <h2>FLSセッション（Forcus Light Spirit）</h2>

            <h3 style="margin-top: 32px; font-size: 1.2rem;">FLSセッションとは</h3>
            <p>
              LS（Focus Light Spirit）セラピーは、潜在意識のメンタルブロックを解除し、魂の成長と使命の実現を促す技術です。<br>
              キネシオロジーを用いて「根源感情」を特定し、家系や過去生、集合無意識などの大元とのリンクを読み解きます。
            </p>
            <p>
              セラピストは<strong>「滅私」の精神</strong>で寄り添い、エネルギーワークを通じて負の連鎖を断ち切り、相談者を本来の輝きへと導きます。
            </p>

            <h3 style="margin-top: 32px; font-size: 1.2rem;">セッションの流れ</h3>
            <ul>
              <li><strong>初回：</strong>2時間（セッション＋説明、潜在意識についての説明）</li>
              <li><strong>2回目以降：</strong>1時間〜1時間半</li>
            </ul>
            <p>
              しっかり話を聴くことを大切にしています。<br />
              吐き出してもらうことで心が解放され、自分の言葉が自分に刺さる瞬間があります。
            </p>

            <h3 style="margin-top: 32px; font-size: 1.2rem;">FLSセッション料金</h3>
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
                <tr><td>9回コース（6ヶ月）</td><td>150,000円</td></tr>
                <tr><td>15回コース（9ヶ月）</td><td>240,000円</td></tr>
                <tr><td>24回コース（12ヶ月・月2回ペース）</td><td>360,000円</td></tr>
              </tbody>
            </table>
          </section>

          <section class="profile-section">
            <h2>レムリアンヒーリング</h2>

            <h3 style="margin-top: 32px; font-size: 1.2rem;">レムリアンヒーリングとは</h3>
            <p>
              ヒーリング中にメッセージやイメージを受け取ることが多いセッションです。<br />
              クライアントさんの想いとリンクする内容が現れてきます。
            </p>
            <p>
              前世の記憶が見えることもあります。子供を育てる役割や、
              自然や森の妖精など、その人らしいイメージが現れます。
            </p>

            <h3 style="margin-top: 32px; font-size: 1.2rem;">レムリアンヒーリング料金</h3>
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

            <div class="callout-box" style="margin-top: 24px;">
              <h3>レムリアン女神ヒーリングアクティベーション講座について</h3>
              <p>
                自分でヒーリングができるようになる講座です。<br />
                お友達・お知り合いと一緒に受講する割引もあります。<br />
                一緒に学ぶことで練習し合え、切磋琢磨できます。
              </p>
            </div>
          </section>

          <section class="profile-section">
            <h2>各種割引</h2>
            <ul>
              <li>知り合い価格</li>
              <li>紹介価格</li>
              <li>グループ受講割引</li>
            </ul>
            <p>詳しくはお問い合わせください。</p>
          </section>

          <div style="margin-top: 60px; text-align: center;">
            <a class="cta-link" href="mailto:hello@example.com">お問い合わせ</a>
          </div>
        </div>
      </article>
    </main>

    <TherapistKaitoFooter />
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'therapist' })

useHead({
  bodyAttrs: { class: 'home' },
  title: 'サービス内容 | 月ノ瀬 海倭',
  meta: [{ name: 'description', content: 'FLSセッション（Future Life Session）とレムリアンヒーリングのご案内。料金とセッションの流れをご紹介します。' }],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap' },
  ],
})
</script>

<style>
@import '~/assets/css/kaito.css';
</style>
