<template>
  <div class="home">
    <TherapistKaitoHeader />

    <main>
      <article class="page-wrapper">
        <header class="page-header">
          <h1>よくある質問</h1>
          <p>
            セッションやヒーリングについて、よくいただくご質問にお答えします。<br />
            この他にも気になることがあれば、お気軽にお問い合わせください。
          </p>
        </header>

        <div class="page-content">
          <div class="faq-list">
            <div class="faq-item">
              <h3>Q. どんな服装で行けばいいですか？</h3>
              <p>
                リラックスできる服装であれば何でも大丈夫です。
                ヒーリングの際は横になることもありますので、締め付けの少ない楽な服装がおすすめです。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. 話した内容は秘密にしてもらえますか？</h3>
              <p>
                はい、セッションでお話しいただいた内容は厳守いたします。
                安心してお話しください。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. オンラインで受けられますか？</h3>
              <p>
                はい、FLSセッションはオンライン（Zoom等）で受けていただけます。
                詳しくはお問い合わせください。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. 単発と継続、どちらがおすすめですか？</h3>
              <p>
                一度外したら終わりではなく、人生の上がり下がりを共に歩むサポートとして、
                継続コースをおすすめしています。<br />
                ただ、まずは単発で試してみて、ご自身に合うかどうか確認されるのも良いと思います。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. レムリアンヒーリングとFLSセッション、どちらを受ければいいですか？</h3>
              <p>
                どちらが良いか迷われている場合は、お気軽にご相談ください。<br />
                お話を伺った上で、あなたに合ったものをご提案いたします。<br />
                FLSセッションは「気づき」を得たい方に、レムリアンヒーリングは
                癒しやリラックスを求めている方におすすめです。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. 支払い方法は？</h3>
              <p>
                銀行振込、または各種キャッシュレス決済に対応しています。
                詳しくはお申し込み時にご案内いたします。
              </p>
            </div>

            <div class="faq-item">
              <h3>Q. キャンセルポリシーは？</h3>
              <p>
                日程変更・キャンセルは、セッション日の3日前までにご連絡ください。<br />
                3日前を過ぎてのキャンセルは、キャンセル料が発生する場合がございます。
                詳しくはお申し込み時にご確認ください。
              </p>
            </div>
          </div>

          <div style="margin-top: 60px; text-align: center;">
            <p style="margin-bottom: 24px;">その他のご質問はお気軽にお問い合わせください</p>
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
  title: 'よくある質問 | 月ノ瀬 海倭',
  meta: [{ name: 'description', content: 'FLSセッション・レムリアンヒーリングについてよくいただくご質問にお答えします。' }],
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
