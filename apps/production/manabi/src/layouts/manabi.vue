<template>
  <div class="mb-root min-h-[100dvh] w-full">
    <div class="mb-bg" aria-hidden="true" />
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
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Maru+Gothic:wght@500;700&display=swap',
    },
  ],
})
</script>

<style>
/* 方眼ノートと若葉色。問題を解く場所なので、色は正解・不正解の合図に取っておく。 */
.mb-root {
  --mb-paper: #f7f6f1;
  --mb-card: #ffffff;
  --mb-ink: #262a27;
  --mb-ink-soft: #676d68;
  --mb-ink-faint: #a3a8a3;
  --mb-line: #e3e3da;
  --mb-line-strong: #cfd0c5;
  --mb-grid: rgba(90, 120, 95, 0.07);
  --mb-accent: #3f7a52;
  --mb-accent-deep: #2f5f3f;
  --mb-accent-soft: #e2eee4;
  --mb-on-accent: #ffffff;
  --mb-good: #2f8a55;
  --mb-good-soft: #e3f3e8;
  --mb-bad: #c9523f;
  --mb-bad-soft: #fbe7e2;
  --mb-shadow: 0 1px 2px rgba(40, 50, 40, 0.05), 0 6px 18px -10px rgba(40, 50, 40, 0.18);

  position: relative;
  color: var(--mb-ink);
  background: var(--mb-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  .mb-root {
    --mb-paper: #141715;
    --mb-card: #1c201d;
    --mb-ink: #e6e8e4;
    --mb-ink-soft: #a3a9a4;
    --mb-ink-faint: #6e746f;
    --mb-line: #2a2f2b;
    --mb-line-strong: #3a403b;
    --mb-grid: rgba(160, 200, 170, 0.045);
    --mb-accent: #7fbf92;
    --mb-accent-deep: #9fd3ad;
    --mb-accent-soft: #233328;
    --mb-on-accent: #10160f;
    --mb-good: #6fcf93;
    --mb-good-soft: #1d3325;
    --mb-bad: #f08a76;
    --mb-bad-soft: #3a211c;
    --mb-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

.mb-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--mb-paper);
  background-image:
    linear-gradient(var(--mb-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--mb-grid) 1px, transparent 1px);
  background-size: 24px 24px;
}

.mb-display {
  font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
  letter-spacing: 0.04em;
}

.mb-card {
  background: var(--mb-card);
  border: 1px solid var(--mb-line);
  border-radius: 18px;
  box-shadow: var(--mb-shadow);
}

/* トップの入力バー（チャットの入力欄と同じ手触り） */
.mb-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.4rem 0.4rem 1.1rem;
  background: var(--mb-card);
  border: 1.5px solid var(--mb-line-strong);
  border-radius: 999px;
  box-shadow: var(--mb-shadow);
  transition: border-color 0.2s;
}
.mb-bar:focus-within {
  border-color: var(--mb-accent);
}
.mb-bar input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  font-size: 16px; /* iOS がフォーカス時に拡大しない下限 */
  color: var(--mb-ink);
  padding: 0.55rem 0;
}
.mb-bar input::placeholder {
  color: var(--mb-ink-faint);
}
.mb-bar input:focus {
  outline: none;
}

.mb-send {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--mb-on-accent);
  background: var(--mb-accent);
  transition: opacity 0.2s, transform 0.15s;
}
.mb-send:active:not(:disabled) {
  transform: scale(0.94);
}
.mb-send:disabled {
  opacity: 0.3;
  cursor: default;
}

/* 問題数などの小さな切り替え */
.mb-chip {
  height: 2rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-size: 13px;
  color: var(--mb-ink-soft);
  border: 1px solid var(--mb-line);
  background: var(--mb-card);
  transition: all 0.15s;
}
.mb-chip:hover {
  border-color: var(--mb-line-strong);
  color: var(--mb-ink);
}
.mb-chip--on {
  color: var(--mb-accent-deep);
  border-color: var(--mb-accent);
  background: var(--mb-accent-soft);
  font-weight: 700;
}

.mb-btn {
  height: 3.25rem;
  padding: 0 1.8rem;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--mb-on-accent);
  background: var(--mb-accent);
  transition: opacity 0.2s, transform 0.15s;
}
.mb-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.mb-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.mb-btn-ghost {
  height: 3rem;
  padding: 0 1.3rem;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--mb-ink);
  border: 1.5px solid var(--mb-line-strong);
  background: var(--mb-card);
  transition: border-color 0.2s, transform 0.15s;
}
.mb-btn-ghost:hover {
  border-color: var(--mb-ink-faint);
}
.mb-btn-ghost:active {
  transform: scale(0.98);
}

.mb-icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--mb-ink-soft);
  transition: background 0.2s, color 0.2s;
}
.mb-icon-btn:hover {
  background: rgba(128, 128, 128, 0.1);
  color: var(--mb-ink);
}

/* 選択肢。押した瞬間に正誤の色がつく。 */
.mb-choice {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  text-align: left;
  padding: 0.95rem 1rem;
  border-radius: 14px;
  border: 1.5px solid var(--mb-line);
  background: var(--mb-card);
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--mb-ink);
  transition: border-color 0.15s, background 0.15s, transform 0.1s, opacity 0.2s;
}
.mb-choice:hover:not(:disabled) {
  border-color: var(--mb-accent);
}
.mb-choice:active:not(:disabled) {
  transform: scale(0.985);
}
.mb-choice:disabled {
  cursor: default;
}
.mb-choice__mark {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  margin-top: -0.05rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--mb-ink-soft);
  background: rgba(128, 128, 128, 0.1);
}
.mb-choice--good {
  border-color: var(--mb-good);
  background: var(--mb-good-soft);
}
.mb-choice--good .mb-choice__mark {
  color: #fff;
  background: var(--mb-good);
}
.mb-choice--bad {
  border-color: var(--mb-bad);
  background: var(--mb-bad-soft);
}
.mb-choice--bad .mb-choice__mark {
  color: #fff;
  background: var(--mb-bad);
}
.mb-choice--dim {
  opacity: 0.45;
}

.mb-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--mb-line);
  overflow: hidden;
}
.mb-progress > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--mb-accent);
  transition: width 0.3s ease;
}

/* どのテーマの問題かを、画面の上に常に出す */
.mb-theme {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin: 0.15rem 0 0.5rem;
  font-size: 12.5px;
  line-height: 1.6;
  color: var(--mb-ink-soft);
}
.mb-theme__label {
  flex-shrink: 0;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 11px;
  color: var(--mb-accent-deep);
  background: var(--mb-accent-soft);
}
.mb-theme__text {
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}

.mb-link {
  font-size: 13px;
  color: var(--mb-ink-soft);
  text-decoration: underline;
  text-underline-offset: 4px;
  transition: color 0.15s;
}
.mb-link:hover {
  color: var(--mb-accent-deep);
}

.mb-chip--sm {
  height: 1.7rem;
  padding: 0 0.7rem;
  font-size: 12px;
}

/* 解答の見返し */
.mb-review-summary {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 1rem;
  cursor: pointer;
  list-style: none;
}
.mb-review-summary::-webkit-details-marker {
  display: none;
}
.mb-review-mark {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  margin-top: 0.1rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
}
.mb-review-mark--good {
  background: var(--mb-good);
}
.mb-review-mark--bad {
  background: var(--mb-bad);
}
.mb-review-choice {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--mb-line);
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--mb-ink-soft);
}
.mb-review-choice__label {
  flex-shrink: 0;
  width: 1.2rem;
  font-weight: 700;
  color: var(--mb-ink-faint);
}
.mb-review-choice--good {
  border-color: var(--mb-good);
  background: var(--mb-good-soft);
  color: var(--mb-ink);
}
.mb-review-choice--bad {
  border-color: var(--mb-bad);
  background: var(--mb-bad-soft);
  color: var(--mb-ink);
}

/* 深掘りの提案・みんなの問題の行 */
.mb-deepen {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.95rem 1.1rem;
  transition: border-color 0.15s, transform 0.1s;
}
.mb-deepen:hover {
  border-color: var(--mb-accent);
}
.mb-deepen:active {
  transform: scale(0.99);
}

@keyframes mb-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.mb-rise {
  animation: mb-rise 0.28s ease both;
}

@keyframes mb-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
.mb-pop {
  animation: mb-pop 0.32s ease both;
}

@keyframes mb-dot {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-4px); }
}
.mb-dots span {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 3px;
  border-radius: 999px;
  background: var(--mb-accent);
  animation: mb-dot 1.2s ease-in-out infinite;
}
.mb-dots span:nth-child(2) { animation-delay: 0.15s; }
.mb-dots span:nth-child(3) { animation-delay: 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .mb-rise,
  .mb-pop,
  .mb-dots span {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
</style>
