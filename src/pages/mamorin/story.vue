<template>
  <div class="mamorin-page">

    <!-- HERO -->
    <div class="container">
      <section class="hero section">
        <p class="hero-eyebrow">私の原体験</p>
        <h1 class="hero-title serif">
          理解が先に来て、<br>
          <strong>許しはずっとあとについてくる。</strong>
        </h1>
        <p class="hero-sub">
          親への恨みを抱えながら、恨んでいる自分を責め続けた年月がありました。<br>
          カウンセラーとしてではなく、一人の人間として、その道を歩いてきた記録です。
        </p>
      </section>
    </div>

    <!-- CHAPTER 1 -->
    <div class="container">
      <section class="section">
        <p class="label">始まり</p>
        <h2 class="section-title serif">父と、まともに話せなくなった日</h2>

        <div class="quote-block">
          <p class="quote-text serif">「親を批判していた、あの頃が、一番自分を許していなかった。」</p>
        </div>

        <p class="story-para">
          私は子どもの頃から父に進路を強要され続け、中学生の頃からまともに父と会話できなくなりました。<br>
          家の中に、ずっと張り詰めたものがありました。父の存在が、重かった。
        </p>
        <p class="story-para">
          心理学を学び、セミナーに通い、父を批判し続けた時代——<br>
          振り返ると、あの頃が最も自分を許していなかった瞬間でした。<br>
          親を恨みながら、恨んでいる自分を責めるという二重の苦しさの中にいました。
        </p>
      </section>
    </div>

    <!-- CHAPTER 2 -->
    <div class="container">
      <section class="section">
        <p class="label">転機</p>
        <h2 class="section-title serif">父の苦しみが、見えた時</h2>

        <p class="story-para">
          転機は、父の苦しみが見えた時でした。
        </p>
        <p class="story-para">
          偉大な父親（私から見た祖父）の影で、自己表現が許されなかった幼少期。<br>
          研究職から営業に左遷され、自分の能力の発揮の場を奪われた社会人時代。<br>
          その苦しみが理解できるにつれ、「強要された」という感覚が徐々に薄れていきました。
        </p>
        <p class="story-para">
          父もまた、自分の痛みを抱えた人間だった。<br>
          そのことが腑に落ちた時、長年胸にあったものが、少しずつほどけていきました。
        </p>
      </section>
    </div>

    <!-- CHAPTER 3 -->
    <div class="container">
      <section class="section">
        <p class="label">プロセス</p>
        <h2 class="section-title serif">感情に、一つひとつ名前をつける作業</h2>

        <p class="story-para">
          恨みを解くために、カウンセリングやコーチングをたくさん受けました。<br>
          また、セラピーを通じて自分の感情——寂しさ、怒り、悲しみ、恥——に一つひとつ形を与えていく、地道な作業をしました。
        </p>
        <p class="story-para">
          感情を可視化することで、初めて自己受容できたのです。<br>
          「自分はこんなふうに傷ついていたのか」と、ようやく自分に言えた時、何かが変わりました。
        </p>

        <div class="quote-block">
          <p class="quote-text serif">「感情は、見えなければ、受け取れない。」</p>
        </div>
      </section>
    </div>

    <!-- CHAPTER 4 -->
    <div class="container">
      <section class="section">
        <p class="label">解放</p>
        <h2 class="section-title serif">恨みを言いまくっていた、あの頃のこと</h2>

        <p class="story-para">
          今思うと恥ずかしくなるくらい、いろんな人に父や母への恨みを言いまくっていました。<br>
          でも、それは必要なプロセスだったと思っています。
        </p>
        <p class="story-para">
          幼少期の自分は、心の中に留めていた親への恨みや怒りを、誰にも話すことなく生きていたのです。<br>
          その分をどこかで解放する必要があったのだと、今は思います。
        </p>
        <p class="story-para">
          自分自身も、そういうことができるカウンセラーでありたいと思っています——<br>
          どんな言葉でも、受け止められる場所でありたいと。
        </p>
      </section>
    </div>

    <!-- CLOSING CTA -->
    <div class="container">
      <section class="section">
        <div class="cta-section" style="padding: 2rem 0 4rem;">
          <h2 class="cta-title serif">
            同じ場所にいるあなたへ。
          </h2>
          <p class="cta-sub">
            ここに書いたことは、私だけの話ではないと思っています。<br>
            もし重なる部分があれば、一度話してみてください。
          </p>
          <NuxtLink to="/mamorin#contact" class="cta-btn">初回無料相談へ</NuxtLink>
        </div>
      </section>
    </div>

    <footer>
      <p>&copy; 2025 自分を許す カウンセリング &amp; セラピー</p>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mamorin' })

useHead({
  title: '私の原体験 — カウンセリング & 感情フォーカス・セラピー',
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@300;400;500&family=Noto+Sans+JP:wght@300;400;500&display=swap',
    },
  ],
})
</script>

<style>
.mamorin-page {
  --bg: #f2fbfc;
  --bg-card: #ffffff;
  --bg-muted: #f0fafb;
  --text: #0a2e38;
  --text-secondary: #1e6878;
  --text-tertiary: #5a9eac;
  --border: rgba(0, 160, 180, 0.14);
  --border-strong: rgba(0, 160, 180, 0.30);
  --accent: #00a8b8;

  font-family: 'Noto Sans JP', sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.8;
  font-size: 15px;
  box-sizing: border-box;
}

.mamorin-page *, .mamorin-page *::before, .mamorin-page *::after { box-sizing: border-box; }

@media (prefers-color-scheme: dark) {
  .mamorin-page {
    --bg: #f2fbfc;
    --bg-card: #ffffff;
    --bg-muted: #f0fafb;
    --text: #0a2e38;
    --text-secondary: #1e6878;
    --text-tertiary: #5a9eac;
    --border: rgba(0, 160, 180, 0.14);
    --border-strong: rgba(0, 160, 180, 0.30);
    --accent: #00a8b8;
  }
}

.mamorin-page .serif { font-family: 'Noto Serif JP', serif; }

.mamorin-page .container { max-width: 720px; margin: 0 auto; padding: 0 1.5rem; }

.mamorin-page .section { padding: 5rem 0; }
.mamorin-page .section + .section { border-top: 0.5px solid var(--border); }

.mamorin-page .section-title {
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(20px, 3vw, 24px);
  font-weight: 400;
  margin-bottom: 2.5rem;
  line-height: 1.6;
}

.mamorin-page .label {
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-tertiary);
  margin-bottom: 1.25rem;
}

.mamorin-page .hero { padding: 6rem 0 5rem; }

.mamorin-page .hero-eyebrow {
  font-size: 11px;
  letter-spacing: 0.2em;
  color: var(--text-tertiary);
  margin-bottom: 2.5rem;
}

.mamorin-page .hero-title {
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 300;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

.mamorin-page .hero-title strong { font-weight: 500; }

.mamorin-page .hero-sub {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2.2;
  max-width: 520px;
}

.mamorin-page .quote-block {
  border-left: 2px solid var(--border-strong);
  padding-left: 1.5rem;
  margin: 2.5rem 0;
}

.mamorin-page .quote-text {
  font-family: 'Noto Serif JP', serif;
  font-size: 18px;
  font-weight: 300;
  line-height: 2;
  color: var(--text);
}

.mamorin-page .story-para {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 2.3;
  margin-bottom: 1.75rem;
}

.mamorin-page .cta-section { text-align: center; padding: 6rem 1.5rem; }

.mamorin-page .cta-title {
  font-family: 'Noto Serif JP', serif;
  font-size: clamp(20px, 3vw, 26px);
  font-weight: 400;
  margin-bottom: 1.5rem;
  line-height: 1.9;
}

.mamorin-page .cta-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 2.5rem; line-height: 2.2; }

.mamorin-page .cta-btn {
  display: inline-block;
  padding: 15px 44px;
  border: none;
  border-radius: 40px;
  font-size: 14px;
  cursor: pointer;
  background: var(--accent);
  color: #ffffff;
  font-family: 'Noto Sans JP', sans-serif;
  text-decoration: none;
  transition: background 0.2s, opacity 0.2s;
}

.mamorin-page .cta-btn:hover { opacity: 0.85; }

.mamorin-page footer {
  border-top: 0.5px solid var(--border);
  padding: 2.5rem 1.5rem;
  text-align: center;
}

.mamorin-page footer p { font-size: 12px; color: var(--text-tertiary); }
</style>
