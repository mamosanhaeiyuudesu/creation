<template>
  <div class="os-root min-h-[100dvh] w-full">
    <div class="os-bg" aria-hidden="true" />
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
.os-root {
  --os-paper: #f7f6f1;
  --os-card: #ffffff;
  --os-ink: #262a27;
  --os-ink-soft: #676d68;
  --os-ink-faint: #a3a8a3;
  --os-line: #e3e3da;
  --os-line-strong: #cfd0c5;
  --os-grid: rgba(90, 120, 95, 0.07);
  --os-accent: #3f7a52;
  --os-accent-deep: #2f5f3f;
  --os-accent-soft: #e2eee4;
  --os-on-accent: #ffffff;
  --os-good: #2f8a55;
  --os-good-soft: #e3f3e8;
  --os-bad: #c9523f;
  --os-bad-soft: #fbe7e2;
  --os-shadow: 0 1px 2px rgba(40, 50, 40, 0.05), 0 6px 18px -10px rgba(40, 50, 40, 0.18);

  position: relative;
  color: var(--os-ink);
  background: var(--os-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  .os-root {
    --os-paper: #141715;
    --os-card: #1c201d;
    --os-ink: #e6e8e4;
    --os-ink-soft: #a3a9a4;
    --os-ink-faint: #6e746f;
    --os-line: #2a2f2b;
    --os-line-strong: #3a403b;
    --os-grid: rgba(160, 200, 170, 0.045);
    --os-accent: #7fbf92;
    --os-accent-deep: #9fd3ad;
    --os-accent-soft: #233328;
    --os-on-accent: #10160f;
    --os-good: #6fcf93;
    --os-good-soft: #1d3325;
    --os-bad: #f08a76;
    --os-bad-soft: #3a211c;
    --os-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }
}

.os-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--os-paper);
  background-image:
    linear-gradient(var(--os-grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--os-grid) 1px, transparent 1px);
  background-size: 24px 24px;
}

.os-display {
  font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
  letter-spacing: 0.04em;
}

.os-card {
  background: var(--os-card);
  border: 1px solid var(--os-line);
  border-radius: 18px;
  box-shadow: var(--os-shadow);
}

/* トップの入力バー（チャットの入力欄と同じ手触り） */
.os-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.4rem 0.4rem 1.1rem;
  background: var(--os-card);
  border: 1.5px solid var(--os-line-strong);
  border-radius: 999px;
  box-shadow: var(--os-shadow);
  transition: border-color 0.2s;
}
.os-bar:focus-within {
  border-color: var(--os-accent);
}
.os-bar input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  font-size: 16px; /* iOS がフォーカス時に拡大しない下限 */
  color: var(--os-ink);
  padding: 0.55rem 0;
}
.os-bar input::placeholder {
  color: var(--os-ink-faint);
}
.os-bar input:focus {
  outline: none;
}

.os-send {
  flex-shrink: 0;
  width: 2.75rem;
  height: 2.75rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--os-on-accent);
  background: var(--os-accent);
  transition: opacity 0.2s, transform 0.15s;
}
.os-send:active:not(:disabled) {
  transform: scale(0.94);
}
.os-send:disabled {
  opacity: 0.3;
  cursor: default;
}

/* 問題数などの小さな切り替え */
.os-chip {
  height: 2rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-size: 13px;
  color: var(--os-ink-soft);
  border: 1px solid var(--os-line);
  background: var(--os-card);
  transition: all 0.15s;
}
.os-chip:hover {
  border-color: var(--os-line-strong);
  color: var(--os-ink);
}
.os-chip--on {
  color: var(--os-accent-deep);
  border-color: var(--os-accent);
  background: var(--os-accent-soft);
  font-weight: 700;
}

.os-btn {
  height: 3.25rem;
  padding: 0 1.8rem;
  border-radius: 999px;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--os-on-accent);
  background: var(--os-accent);
  transition: opacity 0.2s, transform 0.15s;
}
.os-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.os-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.os-btn-ghost {
  height: 3rem;
  padding: 0 1.3rem;
  border-radius: 999px;
  font-size: 14.5px;
  font-weight: 500;
  color: var(--os-ink);
  border: 1.5px solid var(--os-line-strong);
  background: var(--os-card);
  transition: border-color 0.2s, transform 0.15s;
}
.os-btn-ghost:hover {
  border-color: var(--os-ink-faint);
}
.os-btn-ghost:active {
  transform: scale(0.98);
}

.os-icon-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  color: var(--os-ink-soft);
  transition: background 0.2s, color 0.2s;
}
.os-icon-btn:hover {
  background: rgba(128, 128, 128, 0.1);
  color: var(--os-ink);
}

/* 選択肢。押した瞬間に正誤の色がつく。 */
.os-choice {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 0.8rem;
  text-align: left;
  padding: 0.95rem 1rem;
  border-radius: 14px;
  border: 1.5px solid var(--os-line);
  background: var(--os-card);
  font-size: 15.5px;
  line-height: 1.6;
  color: var(--os-ink);
  transition: border-color 0.15s, background 0.15s, transform 0.1s, opacity 0.2s;
}
.os-choice:hover:not(:disabled) {
  border-color: var(--os-accent);
}
.os-choice:active:not(:disabled) {
  transform: scale(0.985);
}
.os-choice:disabled {
  cursor: default;
}
.os-choice__mark {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  margin-top: -0.05rem;
  display: grid;
  place-items: center;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--os-ink-soft);
  background: rgba(128, 128, 128, 0.1);
}
.os-choice--good {
  border-color: var(--os-good);
  background: var(--os-good-soft);
}
.os-choice--good .os-choice__mark {
  color: #fff;
  background: var(--os-good);
}
.os-choice--bad {
  border-color: var(--os-bad);
  background: var(--os-bad-soft);
}
.os-choice--bad .os-choice__mark {
  color: #fff;
  background: var(--os-bad);
}
.os-choice--dim {
  opacity: 0.45;
}

.os-progress {
  height: 4px;
  border-radius: 999px;
  background: var(--os-line);
  overflow: hidden;
}
.os-progress > span {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--os-accent);
  transition: width 0.3s ease;
}

@keyframes os-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.os-rise {
  animation: os-rise 0.28s ease both;
}

@keyframes os-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); }
}
.os-pop {
  animation: os-pop 0.32s ease both;
}

@keyframes os-dot {
  0%, 80%, 100% { opacity: 0.2; transform: translateY(0); }
  40% { opacity: 1; transform: translateY(-4px); }
}
.os-dots span {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin: 0 3px;
  border-radius: 999px;
  background: var(--os-accent);
  animation: os-dot 1.2s ease-in-out infinite;
}
.os-dots span:nth-child(2) { animation-delay: 0.15s; }
.os-dots span:nth-child(3) { animation-delay: 0.3s; }

@media (prefers-reduced-motion: reduce) {
  .os-rise,
  .os-pop,
  .os-dots span {
    animation-duration: 0.01ms;
    animation-iteration-count: 1;
  }
}
</style>
