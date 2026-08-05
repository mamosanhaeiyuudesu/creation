<template>
  <div class="kr-root min-h-[100dvh] w-full">
    <div class="kr-bg" aria-hidden="true" />
    <div class="relative z-[1]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500&family=Shippori+Mincho:wght@500&display=swap',
    },
  ],
})
</script>

<style>
/* 生成りの紙と墨。刺激の強い色は置かない。 */
.kr-root {
  --kr-paper: #f5f2ec;
  --kr-paper-2: #efebe2;
  --kr-card: #fffdf9;
  --kr-ink: #33373a;
  --kr-ink-soft: #6f7377;
  --kr-ink-faint: #a1a49f;
  --kr-line: #e4dfd4;
  --kr-line-strong: #d3cdbf;
  --kr-accent: #5f8880;
  --kr-accent-deep: #4a6f68;
  --kr-accent-soft: #c3d6d1;
  --kr-shadow: 0 1px 2px rgba(60, 55, 45, 0.05);

  position: relative;
  color: var(--kr-ink);
  background: var(--kr-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* 端末が暗いときの既定。明るい表示を選んでいる間は適用しない。 */
@media (prefers-color-scheme: dark) {
  html:not([data-kiroku-theme='light']) .kr-root {
    --kr-paper: #16181b;
    --kr-paper-2: #121417;
    --kr-card: #1d2024;
    --kr-ink: #e4e2dc;
    --kr-ink-soft: #a0a29e;
    --kr-ink-faint: #71746f;
    --kr-line: #2b2f34;
    --kr-line-strong: #3b4046;
    --kr-accent: #8fb3ab;
    --kr-accent-deep: #a7c7c0;
    --kr-accent-soft: #334743;
    --kr-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }
}
html[data-kiroku-theme='dark'] .kr-root {
  --kr-paper: #16181b;
  --kr-paper-2: #121417;
  --kr-card: #1d2024;
  --kr-ink: #e4e2dc;
  --kr-ink-soft: #a0a29e;
  --kr-ink-faint: #71746f;
  --kr-line: #2b2f34;
  --kr-line-strong: #3b4046;
  --kr-accent: #8fb3ab;
  --kr-accent-deep: #a7c7c0;
  --kr-accent-soft: #334743;
  --kr-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.kr-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, var(--kr-paper) 0%, var(--kr-paper-2) 100%);
}

.kr-display {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  letter-spacing: 0.06em;
}

/* 書く場所。枠を主張させず、紙にそのまま書く感じにする。 */
.kr-write {
  width: 100%;
  background: transparent;
  border: none;
  resize: none;
  color: var(--kr-ink);
  font-size: 17px;
  line-height: 2;
  letter-spacing: 0.02em;
}
.kr-write::placeholder {
  color: var(--kr-ink-faint);
  line-height: 2;
}
.kr-write:focus {
  outline: none;
}

.kr-card {
  background: var(--kr-card);
  border: 1px solid var(--kr-line);
  border-radius: 14px;
  box-shadow: var(--kr-shadow);
}

.kr-btn {
  height: 3rem;
  padding: 0 2.2rem;
  border-radius: 999px;
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.08em;
  /* 明暗どちらでも文字が沈まないよう、地の明度で色を決める */
  color: var(--kr-paper);
  background: var(--kr-accent);
  transition: opacity 0.2s, transform 0.2s;
}
.kr-btn:hover:not(:disabled) {
  opacity: 0.9;
}
.kr-btn:active:not(:disabled) {
  transform: scale(0.985);
}
.kr-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

.kr-btn-quiet {
  height: 2.25rem;
  padding: 0 0.95rem;
  border-radius: 999px;
  font-size: 13px;
  color: var(--kr-ink-soft);
  border: 1px solid var(--kr-line);
  background: transparent;
  transition: border-color 0.2s, color 0.2s;
}
.kr-btn-quiet:hover:not(:disabled) {
  border-color: var(--kr-line-strong);
  color: var(--kr-ink);
}
.kr-btn-quiet:disabled {
  opacity: 0.4;
  cursor: default;
}

/* ヘッダーの小さな丸ボタン（検索・カレンダー・表示切替） */
.kr-icon-btn {
  width: 2.25rem;
  height: 2.25rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--kr-ink-soft);
  transition: background 0.2s, color 0.2s;
}
.kr-icon-btn:hover {
  background: rgba(128, 128, 128, 0.09);
  color: var(--kr-ink);
}
.kr-icon-btn--on {
  background: var(--kr-accent-soft);
  color: var(--kr-accent-deep);
}

.kr-input {
  width: 100%;
  background: var(--kr-card);
  border: 1px solid var(--kr-line);
  border-radius: 999px;
  padding: 0.55rem 1rem;
  font-size: 14px;
  color: var(--kr-ink);
  transition: border-color 0.2s;
}
.kr-input::placeholder {
  color: var(--kr-ink-faint);
}
.kr-input:focus {
  outline: none;
  border-color: var(--kr-accent);
}

.kr-body {
  font-size: 15px;
  line-height: 1.95;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 保存したときの、ごく控えめな合図 */
@keyframes kr-mark {
  0% { opacity: 0; transform: translateY(6px) scale(0.94); }
  18% { opacity: 1; transform: translateY(0) scale(1); }
  75% { opacity: 1; }
  100% { opacity: 0; transform: translateY(-4px); }
}
.kr-mark {
  animation: kr-mark 1.9s ease both;
}

@keyframes kr-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.kr-fade-in {
  animation: kr-fade-in 0.35s ease both;
}

@media (prefers-reduced-motion: reduce) {
  .kr-mark,
  .kr-fade-in {
    animation-duration: 0.01ms;
  }
}
</style>
