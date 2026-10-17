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
      href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap',
    },
  ],
})
</script>

<style>
/*
 * クイズ番組のポスター（生成りの紙・濃紺・朱赤）の配色。
 * 濃紺を基調にし、朱赤は「押すボタン」と「正解」にだけ使う。
 * 正解＝赤丸・不正解＝濃紺の×（採点の赤ペンと同じ感覚）。◯✕の記号も必ず添えるので色だけに頼らない。
 * ダークモードは持たない（端末が暗くても背景は常に明るい紙色）。
 * フォントはキキガキ本番版にそろえて Noto Sans JP。
 */
.mb-root {
  --mb-paper: #f7f5ef;
  --mb-card: #ffffff;
  --mb-ink: #252c3a;
  --mb-ink-soft: #5a6272;
  --mb-ink-faint: #9aa0ab;
  --mb-line: #e2e0d8;
  --mb-line-strong: #c9c8c0;
  --mb-grid: rgba(37, 44, 58, 0.05);
  --mb-accent: #e2463a;
  --mb-accent-deep: #c23328;
  --mb-accent-soft: #fde8e5;
  --mb-on-accent: #ffffff;
  --mb-navy: #252c3a;
  --mb-navy-soft: #e7e9ee;
  --mb-good: #e2463a;
  --mb-good-soft: #fde8e5;
  --mb-bad: #3b4558;
  --mb-bad-soft: #e7e9ee;
  --mb-shadow: 0 1px 2px rgba(37, 44, 58, 0.05), 0 6px 18px -10px rgba(37, 44, 58, 0.2);

  position: relative;
  color-scheme: light;
  color: var(--mb-ink);
  background: var(--mb-paper);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
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
  font-weight: 900;
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
  color: var(--mb-navy);
  border-color: var(--mb-navy);
  background: var(--mb-navy-soft);
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
.mb-btn-ghost:disabled {
  opacity: 0.35;
  cursor: default;
}
.mb-btn-ghost:hover:not(:disabled) {
  border-color: var(--mb-ink-faint);
}
.mb-btn-ghost:active {
  transform: scale(0.98);
}

.mb-back {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  height: 2.5rem;
  padding: 0 0.8rem 0 0.45rem;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--mb-ink-soft);
  transition: background 0.2s, color 0.2s;
}
.mb-back:hover {
  background: rgba(128, 128, 128, 0.1);
  color: var(--mb-ink);
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
  color: var(--mb-card);
  background: var(--mb-good);
}
.mb-choice--bad {
  border-color: var(--mb-bad);
  background: var(--mb-bad-soft);
}
.mb-choice--bad .mb-choice__mark {
  color: var(--mb-card);
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
  color: var(--mb-navy);
  background: var(--mb-navy-soft);
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
  color: var(--mb-card);
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
