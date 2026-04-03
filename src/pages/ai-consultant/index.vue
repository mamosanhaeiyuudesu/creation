<template>
  <div class="aico-page">

    <!-- ナビゲーション -->
    <nav class="aico-nav">
      <div class="aico-wrap">
        <span class="aico-nav-logo">AI Consultant</span>
        <ul class="aico-nav-links">
          <li><a href="#philosophy">理念</a></li>
          <li><a href="#services">提供できること</a></li>
          <li><a href="#message">あなたへ</a></li>
          <li><a href="#contact">お問い合わせ</a></li>
        </ul>
      </div>
    </nav>

    <!-- ヒーロー -->
    <section class="aico-hero">
      <div class="aico-wrap">
        <span class="aico-eyebrow">AI × Human Collaboration</span>
        <h1 class="aico-catch">
          AIに仕事を奪われる？<br />
          <span>それより大事な話があります。</span>
        </h1>
        <p class="aico-sub">
          今、人間がどうAIと関わるかで、この先の社会の形が変わります。<br />
          「AIを使いこなす」の前に、自分が何をしたいかを一緒に考えましょう。
        </p>
        <a href="#contact" class="aico-cta">
          話を聞いてみる
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </a>
      </div>
    </section>

    <!-- 理念 -->
    <section id="philosophy" class="aico-philosophy">
      <div class="aico-wrap">
        <p class="aico-label">Philosophy</p>
        <h2 class="aico-section-title">理念</h2>

        <div class="philosophy-body">
          <p class="philosophy-lead">
            私たちは今、歴史的な分岐点に立っています。
          </p>
          <p>
            AIの登場で、「こうしたい」と思ったことがかつてないスピードで形になる時代が始まりました。ロボット技術の発展を見れば、近い将来、物理的な作業すらAIが担う社会が来ることも、もはや疑いようがありません。
          </p>
          <p>
            このとき問われるのは、「AIに仕事を奪われるかどうか」ではありません。<strong>人間がAIといかに協調して生きるか</strong>、です。
          </p>
          <p>
            人間が本来持っている意志・価値観・創造性——それは純粋に素晴らしいものです。AIはその創造性を奪う存在ではなく、あなたの意志を具現化するパートナーです。
          </p>

          <div class="philosophy-highlight">
            この理解が広まるかどうかで、来たる社会が理想になるか地獄になるかが決まる——私はそう本気で考えています。
          </div>
        </div>
      </div>
    </section>

    <!-- 提供できること -->
    <section id="services" class="aico-services">
      <div class="aico-wrap">
        <p class="aico-label">Services</p>
        <h2 class="aico-section-title">提供できること</h2>

        <div class="aico-service-grid">

          <div class="aico-service-card">
            <div class="aico-service-num">01</div>
            <h3 class="aico-service-title">仕組みレベルからの説明</h3>
            <p class="aico-service-body">
              「なぜそう動くのか」という構造的な視点でAIを解説します。表面的な使い方だけでなく、本質を理解することで応用が利くようになります。エンジニアとしての経験をもとに、難しすぎず・浅すぎずのちょうどいい解像度で話します。
            </p>
          </div>

          <div class="aico-service-card">
            <div class="aico-service-num">02</div>
            <h3 class="aico-service-title">双方向のディスカッション</h3>
            <p class="aico-service-body">
              一方的な講義ではなく、あなたの疑問・状況・課題を起点にした対話を大切にします。随時質問を受け付け、あなた自身の言葉で「あ、そういうことか」と腹落ちするまで話し合います。
            </p>
          </div>

          <div class="aico-service-card">
            <div class="aico-service-num">03</div>
            <h3 class="aico-service-title">実生活への落とし込み</h3>
            <p class="aico-service-body">
              抽象的な話で終わりません。あなたの仕事や日常の文脈に合わせて、実際に使える形へと一緒に翻訳していきます。「わかったけど、じゃあ自分はどうすればいいの？」という問いに向き合います。
            </p>
          </div>

        </div>
      </div>
    </section>

    <!-- あなたへ -->
    <section id="message" class="aico-message">
      <div class="aico-wrap">
        <p class="aico-label">For You</p>
        <h2 class="aico-section-title">あなたに伝えたいこと</h2>

        <div class="message-body">
          <p class="message-lead">
            AIを「使いこなす」より前に、<strong>自分が何を実現したいのか</strong>を問うことが先です。
          </p>
          <p>
            意志のある人間が、AIというパートナーを得た。それがこの時代の本質です。
          </p>
          <p>
            ツールに振り回されるのではなく、自分の意志を起点に動くこと。その意志の育て方と、AIの活かし方を、一緒に考えていきましょう。
          </p>
        </div>

        <ul class="aico-for-you-list">
          <li>
            <span class="aico-check">✓</span>
            AIを使ってみたけど、なんかうまく使えている気がしない人。
          </li>
          <li>
            <span class="aico-check">✓</span>
            「AIで仕事がなくなる」と不安になっている人。
          </li>
          <li>
            <span class="aico-check">✓</span>
            AIの仕組みをちゃんと理解して、自分の仕事に活かしたい人。
          </li>
          <li>
            <span class="aico-check">✓</span>
            一人で試行錯誤するより、誰かと一緒に考えたい人。
          </li>
        </ul>
      </div>
    </section>

    <!-- CTA -->
    <section id="contact" class="aico-cta-section">
      <div class="aico-wrap">
        <div class="aico-cta-inner">
          <h2 class="aico-cta-title">まず、話してみませんか。</h2>
          <p class="aico-cta-desc">
            「AIってよくわからない」「自分の仕事にどう使えばいい？」<br />
            そんな入口でも大丈夫。一緒に考えましょう。
          </p>
          <a href="mailto:" class="aico-btn-primary">
            メールで連絡する
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/></svg>
          </a>
        </div>
      </div>
    </section>

    <!-- フッター -->
    <footer class="aico-footer">
      <div class="aico-wrap">
        <span class="aico-footer-copy">&copy; 2026 AI Consultant</span>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'ai-consultant' })

useHead({
  title: 'AI Consultant | AIと人間の協調を、一緒に考える。',
  meta: [
    { name: 'description', content: 'AIの仕組みを理解し、自分の意志を起点に活かすための対話型コンサルティング。「AIに仕事を奪われる」ではなく、AIをパートナーとして生きるための考え方を一緒に育てます。' },
    { property: 'og:title', content: 'AI Consultant | AIと人間の協調を、一緒に考える。' },
    { property: 'og:description', content: 'AIの仕組みを理解し、自分の意志を起点に活かすための対話型コンサルティング。' },
  ],
})
</script>

<style>
/* ==========================================
   AI Consultant（理念ページ）
   .aico-page スコープ
   ========================================== */

.aico-page {
  --c-bg: #f5f0e8;
  --c-bg-surface: #ede6d8;
  --c-bg-card: #faf7f2;
  --c-border: rgba(80, 60, 20, 0.12);
  --c-primary: #2d1f0e;
  --c-accent: #b85a00;
  --c-accent-light: #d97000;
  --c-text: #1e1408;
  --c-text-muted: #6b5840;
  --c-text-dim: #9e8c76;
  --content-max: 780px;
  --section-gap: 88px;
  --radius: 14px;
  --radius-lg: 22px;

  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans JP", "Helvetica Neue", sans-serif;
  background: var(--c-bg);
  color: var(--c-text);
  line-height: 1.85;
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.aico-page *, .aico-page *::before, .aico-page *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.aico-page a {
  color: inherit;
  text-decoration: none;
}

/* ナビ */
.aico-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(245, 240, 232, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--c-border);
}

.aico-nav > .aico-wrap {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.aico-nav-logo {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--c-accent);
}

.aico-nav-links {
  display: flex;
  gap: 28px;
  list-style: none;
}

.aico-nav-links a {
  font-size: 13px;
  color: var(--c-text-muted);
  transition: color 0.2s;
}

.aico-nav-links a:hover {
  color: var(--c-accent);
}

/* 共通ラッパー */
.aico-wrap {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 0 24px;
}

.aico-page section {
  padding: var(--section-gap) 0;
}

.aico-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-accent);
  margin-bottom: 12px;
}

.aico-section-title {
  font-size: clamp(22px, 4vw, 30px);
  font-weight: 700;
  line-height: 1.35;
  color: var(--c-text);
  margin-bottom: 32px;
}

/* ヒーロー */
.aico-hero {
  padding: 100px 0 90px;
  position: relative;
  overflow: hidden;
}

.aico-hero::before {
  content: '';
  position: absolute;
  top: -160px;
  left: 50%;
  transform: translateX(-50%);
  width: 700px;
  height: 700px;
  background: radial-gradient(ellipse at center, rgba(184, 90, 0, 0.07) 0%, transparent 65%);
  pointer-events: none;
}

.aico-eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-accent);
  display: block;
  margin-bottom: 20px;
}

.aico-catch {
  font-size: clamp(28px, 5.5vw, 46px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
  color: var(--c-text);
  margin-bottom: 24px;
}

.aico-catch span {
  background: linear-gradient(135deg, var(--c-accent), var(--c-accent-light));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.aico-sub {
  font-size: 17px;
  color: var(--c-text-muted);
  line-height: 1.8;
  max-width: 580px;
  margin-bottom: 40px;
}

.aico-cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--c-accent);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  padding: 14px 28px;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.aico-cta:hover {
  background: var(--c-accent-light);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(184, 90, 0, 0.28);
}

/* 理念 */
.aico-philosophy {
  background: var(--c-bg-surface);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
}

.philosophy-body {
  color: var(--c-text-muted);
  line-height: 1.95;
  font-size: 16px;
}

.philosophy-body p + p {
  margin-top: 18px;
}

.philosophy-lead {
  font-size: 19px;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.7;
}

.philosophy-body strong {
  color: var(--c-text);
  font-weight: 700;
}

.philosophy-highlight {
  margin-top: 32px;
  padding: 24px 28px;
  background: var(--c-bg-card);
  border-left: 4px solid var(--c-accent);
  border-radius: 0 var(--radius) var(--radius) 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.75;
}

/* サービス */
.aico-service-grid {
  display: grid;
  gap: 16px;
}

.aico-service-card {
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: 32px 32px 32px 88px;
  position: relative;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.aico-service-card:hover {
  border-color: rgba(184, 90, 0, 0.3);
  box-shadow: 0 6px 24px rgba(184, 90, 0, 0.07);
}

.aico-service-num {
  position: absolute;
  left: 32px;
  top: 32px;
  font-size: 28px;
  font-weight: 800;
  color: rgba(184, 90, 0, 0.18);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.aico-service-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--c-text);
  margin-bottom: 10px;
}

.aico-service-body {
  font-size: 14px;
  color: var(--c-text-muted);
  line-height: 1.85;
}

/* あなたへ */
.aico-message {
  background: var(--c-bg-surface);
  border-top: 1px solid var(--c-border);
  border-bottom: 1px solid var(--c-border);
}

.message-body {
  color: var(--c-text-muted);
  line-height: 1.95;
  margin-bottom: 36px;
}

.message-body p + p {
  margin-top: 16px;
}

.message-lead {
  font-size: 18px;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1.7;
}

.message-body strong {
  color: var(--c-accent);
}

.aico-for-you-list {
  list-style: none;
  display: grid;
  gap: 12px;
}

.aico-for-you-list li {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  background: var(--c-bg-card);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 16px 20px;
  font-size: 15px;
  color: var(--c-text-muted);
  line-height: 1.65;
  transition: border-color 0.2s;
}

.aico-for-you-list li:hover {
  border-color: rgba(184, 90, 0, 0.3);
}

.aico-check {
  color: var(--c-accent);
  font-size: 16px;
  flex-shrink: 0;
  font-weight: 700;
  margin-top: 1px;
}

/* CTA */
.aico-cta-section {
  background: var(--c-primary);
}

.aico-cta-inner {
  text-align: center;
  max-width: 520px;
  margin: 0 auto;
}

.aico-cta-title {
  font-size: clamp(22px, 4vw, 30px);
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 16px;
  line-height: 1.4;
}

.aico-cta-desc {
  font-size: 15px;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.8;
  margin-bottom: 36px;
}

.aico-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--c-accent);
  color: #fff;
  font-weight: 600;
  font-size: 15px;
  padding: 14px 28px;
  border-radius: 9999px;
  transition: all 0.2s;
}

.aico-btn-primary:hover {
  background: var(--c-accent-light);
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(184, 90, 0, 0.4);
}

/* フッター */
.aico-footer {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding: 32px 0;
  background: var(--c-primary);
}

.aico-footer .aico-wrap {
  display: flex;
  justify-content: center;
}

.aico-footer-copy {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

/* レスポンシブ */
@media (max-width: 640px) {
  .aico-page {
    --section-gap: 60px;
  }

  .aico-nav-links {
    display: none;
  }

  .aico-hero {
    padding: 72px 0 56px;
  }

  .aico-service-card {
    padding: 24px 24px 24px 24px;
  }

  .aico-service-num {
    position: static;
    display: block;
    margin-bottom: 8px;
    font-size: 22px;
  }
}
</style>
