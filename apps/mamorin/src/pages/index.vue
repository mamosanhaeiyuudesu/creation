<template>
  <div class="mm-page">

    <!-- ヒーロー -->
    <section class="mm-hero">
      <div class="mm-wrap">
        <div class="mm-hero-inner">
          <div class="mm-hero-text">
            <p class="mm-hero-eyebrow">感情フォーカス・カウンセリング / オンライン</p>
            <h1 class="mm-hero-title">
              親への恨みを手放し、<br>
              自分の人生を生きる
            </h1>
            <p class="mm-hero-sub">
              
            </p>
            <a class="mm-hero-cta" href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer">
              無料相談フォームへ
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
          <div class="mm-hero-deco" aria-hidden="true">
            <svg viewBox="0 0 280 280" fill="none" xmlns="http://www.w3.org/2000/svg" class="mm-taijitu">
              <!-- 外周装飾リング -->
              <circle cx="140" cy="140" r="132" stroke="rgba(0,118,134,0.07)" stroke-width="1"/>
              <!-- 陰（yin）: ベース円 -->
              <circle cx="140" cy="140" r="120" fill="rgba(0,118,134,0.68)" stroke="rgba(0,118,134,0.35)" stroke-width="1.5"/>
              <!-- 陽（yang）: S字パス -->
              <path d="M 140 20 A 120 120 0 0 1 140 260 A 60 60 0 0 0 140 140 A 60 60 0 0 1 140 20 Z" fill="rgba(240,246,244,0.90)"/>
              <!-- 陽の中の小円（陰点） -->
              <circle cx="140" cy="80" r="20" fill="rgba(0,118,134,0.68)"/>
              <!-- 陰の中の小円（陽点） -->
              <circle cx="140" cy="200" r="20" fill="rgba(240,246,244,0.90)"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- こんな方へ -->
    <section id="for-you" class="mm-surface">
      <div class="mm-wrap">
        <p class="mm-section-label">For You</p>
        <h4 class="mm-section-title">親子関係が影響して、以下の問題を抱えてませんか？</h4>
        <div class="mm-for-you-inner">
          <ul class="mm-for-you-list">
            <li><span class="mm-for-you-dash">—</span>目上の人への反発心が強く、人間関係がうまく作れない。</li>
            <li><span class="mm-for-you-dash">—</span>他人の目線を過度に意識して、自分を抑え込んでいる。</li>
            <li><span class="mm-for-you-dash">—</span>頑張っても、自分を認められず、達成感を感じられない。</li>
          </ul>
          <img src="/images/mamorin.png" alt="" class="mm-for-you-photo">
        </div>
      </div>
    </section>

    <!-- サービス -->
    <section id="services" class="mm-surface">
      <div class="mm-wrap">
        <p class="mm-section-label">Services</p>
        <h2 class="mm-section-title">セッションの内容</h2>
        <div class="mm-service-grid">
          <div class="mm-service-card">
            <p class="mm-service-type">Service 01</p>
            <h3 class="mm-service-name">カウンセリング</h3>
            <p class="mm-service-desc">感情にフォーカスしながら、話すことから始めます。<br>怒りや悲しみをしっかり感じきることで、長年抱えてきた未消化の感情を解放することを目指します。</p>
            <ul class="mm-service-points">
              <li>傾聴・対話を中心とした60分セッション</li>
              <li>オンライン（ビデオ通話）対応</li>
              <li>親との関係にフォーカスした対話</li>
              <li>初回無料相談あり（30分）</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- お客様の声 -->
    <section>
      <div class="mm-wrap">
        <p class="mm-section-label">Voice</p>
        <h2 class="mm-section-title">お客様の声</h2>
        <div class="mm-strength-list">
          <div class="mm-strength-item">
            <p class="mm-strength-num">30代 男性</p>
            <h3 class="mm-strength-title">「自分だけじゃなかったんだ」という一言に尽きます。</h3>
            <p class="mm-strength-body">父親のことを、友人に話しても深く共感してもらえたことがなかった。まもりんさんと話して初めて、「親と自分」という閉じた関係が外に開いた感じがしました。ずっと抱えていた何かが、緩んだんです。</p>
          </div>
          <div class="mm-strength-item">
            <p class="mm-strength-num">40代 女性</p>
            <h3 class="mm-strength-title">「自分を可愛がりたかった」という言葉が、自分の口から出てきた。</h3>
            <p class="mm-strength-body">感情がわからないまま日常に流されていた。セッションを通じて、奥に積み重なっていたものに気づき、「長い間詰まっていたものが、やっとすっと通り抜けていった」という感覚になりました。</p>
          </div>
        </div>
        <NuxtLink to="/voice" class="mm-cta-btn">お客様の声を読む</NuxtLink>
      </div>
    </section>

    <!-- 私の原体験 -->
    <section>
      <div class="mm-wrap">
        <p class="mm-section-label">Story</p>
        <h2 class="mm-section-title">理解が先に来て、許しはずっとあとについてくる</h2>
        <div class="mm-quote-block">
          <p class="mm-quote-text">「親を批判していた、あの頃が、一番自分を許していなかった。」</p>
        </div>
        <p class="mm-story-para">父への長年の恨みと、恨んでいる自分を責める二重の苦しさ——<br>私自身がその場所にいました。<br>そして、その場所から抜け出す道を、自分で歩いてきました。</p>
        <p class="mm-story-para">その道で出会ったのが、同じように父親への恨みを抱えながらそれを乗り越えてきた、一人の男性カウンセラーの存在でした。<br>その人の本、その人との関わり、そして実際のセッションが、私の中に確かな変化をもたらしてくれました。</p>
        <NuxtLink to="/story" class="mm-cta-btn">私の原体験を読む</NuxtLink>
      </div>
    </section>

    <!-- プロフィール -->
    <section id="profile" class="mm-surface">
      <div class="mm-wrap">
        <p class="mm-section-label">Profile</p>
        <div class="mm-profile-inner">
          <h3 class="mm-profile-name">まもりん</h3>
          <p class="mm-profile-role">Counselor / Emotion-Focused Therapist</p>
          <p class="mm-profile-bio">両親との長年の葛藤と、それを乗り越えたプロセスを自ら経験。心理学・セラピー・コーチングを学び、感情の言語化を通じた自己受容のアプローチを実践している。現在は子どもと共に生活を続ける父親でもあり、家族との関係を大切にしながら、同じ見えない痛みを抱える方の伴走をしたいと考えている。AI・IT分野のプロフェッショナルとしても活動しており、論理と感情の両方の視点を持つ。</p>
        </div>
      </div>
    </section>

    <!-- 料金 -->
    <section id="pricing">
      <div class="mm-wrap">
        <p class="mm-section-label">Pricing</p>
        <h2 class="mm-section-title">料金体系</h2>
        <div class="mm-price-grid">
          <div class="mm-price-row mm-price-row--first">
            <div class="mm-price-top">
              <div>
                <p class="mm-price-name">初回無料相談</p>
                <p class="mm-price-detail">30分 / オンライン</p>
              </div>
              <div>
                <p class="mm-price-amount">無料</p>
                <span class="mm-price-badge">まずここから</span>
              </div>
            </div>
            <p class="mm-price-note">これまでの人生やカウンセリングで叶えたいことを共有し、今後の進め方をご一緒に確認します。</p>
          </div>
          <div class="mm-price-row">
            <div>
              <p class="mm-price-name">カウンセリング</p>
              <p class="mm-price-detail">60分 / オンライン</p>
            </div>
            <div>
              <p class="mm-price-amount">¥5,000 <span class="mm-price-unit">/ 回</span></p>
            </div>
          </div>
          <div class="mm-price-row">
            <div>
              <p class="mm-price-name">継続パッケージ</p>
              <p class="mm-price-detail">10回セット（カウンセリング）</p>
            </div>
            <div>
              <p class="mm-price-amount">¥40,000 <span class="mm-price-unit">/ 10回</span></p>
              <span class="mm-price-badge">20%お得</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- よくある質問 -->
    <section class="mm-surface">
      <div class="mm-wrap">
        <p class="mm-section-label">Q&amp;A</p>
        <h2 class="mm-section-title">よくある質問</h2>
        <p class="mm-story-para">「どんな人が対象？」「セッションでは何をするの？」「心理系の資格は持っていないの？」<br>気になる疑問にまとめてお答えしています。</p>
        <NuxtLink to="/qa" class="mm-cta-btn">よくある質問を見る</NuxtLink>
      </div>
    </section>

    <!-- コンタクト CTA -->
    <section id="contact" class="mm-cta">
      <div class="mm-wrap">
        <div class="mm-cta-inner">
          <p class="mm-section-label">Contact</p>
          <h2 class="mm-cta-title">同じ場所にいるあなたへ。</h2>
          <p class="mm-cta-desc">初回30分は無料で、お話を聞かせてください。<br>いただいた情報は相談対応以外に使用しません。</p>
          <div class="mm-cta-buttons">
            <a class="mm-btn-primary" href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer">
              無料相談フォームへ
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
          </div>
        </div>
      </div>
    </section>

    <footer class="mm-footer">
      <div class="mm-footer-inner">
        <span class="mm-footer-copy">&copy; 2026 自分を許す カウンセリング &amp; セラピー</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'mamorin' })

useHead({
  title: '自分を許す — カウンセリング & 感情フォーカス・セラピー',
  meta: [
    { name: 'description', content: '親への恨みを手放し、自分を許せる自分になる。オンラインカウンセリング・感情フォーカス・セラピー。初回30分無料相談あり。' },
  ],
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☯</text></svg>` },
  ],
})
</script>

<style scoped>
.mm-taijitu {
  animation: taijituSpin 24s linear infinite;
  transform-origin: center;
}

@keyframes taijituSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
</style>
