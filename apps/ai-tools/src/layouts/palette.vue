<template>
  <div class="pl-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 見た目の作りはキキガキ本番版（apps/production/kikigaki の kikigaki.css）に合わせている
// （Noto Sans JP・本文14px・白いカードに薄い影・ピル型ボタン・ボトムシートのモーダル）。
// 色だけは palette 独自のまま（紙色の地・朱の主役ボタン・青緑の差し色）。クラス接頭辞は pl-。
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  ],
})
</script>

<style>
/* モーダルを Teleport で出しても色が抜けないよう、変数は :root に置く（キキガキと同じ理由）。
   他ツールと衝突しないよう --pl- で始める */
:root {
  --pl-paper: #f6f2ea;
  --pl-paper-2: #ece6d9;
  --pl-card: #ffffff;
  --pl-ink: #2a2723;
  --pl-ink-soft: #5c564c;
  --pl-ink-faint: #8f887b;
  --pl-line: #e2dbcb;
  --pl-line-strong: #cbc1ab;
  /* 主役ボタンの朱。1画面に1つだけ */
  --pl-vermilion: #e0522b;
  --pl-vermilion-deep: #bd3d1a;
  --pl-teal: #1f8a8a;
  --pl-teal-deep: #166868;
  --pl-teal-soft: #e5f3f3;
  --pl-mustard: #e8b630;
  --pl-wisteria: #8a74c7;
  --pl-danger: #c62828;
  --pl-danger-soft: #fdf1f1;
  --pl-shadow: 0 2px 10px rgba(80, 55, 20, 0.07);
}

.pl-root {
  min-height: 100dvh;
  color: var(--pl-ink);
  background: var(--pl-paper);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

/* ── 文字 ── */
.pl-h1 { font-size: 20px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; }
.pl-h2 { font-size: 15px; font-weight: 700; line-height: 1.5; }
.pl-note { font-size: 12px; color: var(--pl-ink-faint); line-height: 1.7; }

/* ── 面 ── */
.pl-card {
  background: var(--pl-card);
  border: 1px solid var(--pl-line);
  border-radius: 10px;
  box-shadow: var(--pl-shadow);
  padding: 0.9rem 1rem;
}
.pl-notice { border-radius: 8px; padding: 0.55rem 0.8rem; font-size: 13px; line-height: 1.7; }
.pl-notice--error { background: var(--pl-danger-soft); border: 1px solid #f0c2c2; color: var(--pl-danger); }

/* ── 入力 ── */
.pl-label { display: block; font-size: 12px; font-weight: 700; color: var(--pl-ink-soft); }
.pl-input {
  width: 100%;
  background: #fff;
  border: 1px solid var(--pl-line);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-family: inherit;
  font-size: 16px; /* 16px未満にするとiOSが勝手にズームする（PCだけ下で詰める） */
  line-height: 1.6;
  color: var(--pl-ink);
  transition: border-color 0.15s;
}
.pl-input::placeholder { color: var(--pl-ink-faint); }
.pl-input:focus { outline: none; border-color: var(--pl-teal); box-shadow: 0 0 0 3px var(--pl-teal-soft); }
textarea.pl-input { resize: vertical; }
@media (min-width: 768px) {
  .pl-input { font-size: 14px; }
}

/* ── 押せるもの ── */
.pl-btn {
  min-height: 44px;
  padding: 0 1.4rem;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--pl-vermilion);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.pl-btn:hover:not(:disabled) { background: var(--pl-vermilion-deep); }
.pl-btn:disabled { opacity: 0.45; cursor: default; }

/* 脇役。主役と並べても迷わない見た目にする */
.pl-btn-ghost {
  min-height: 34px;
  padding: 0 0.85rem;
  border: 1px solid var(--pl-line-strong);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--pl-ink);
  background: var(--pl-card);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  text-decoration: none;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.pl-btn-ghost:hover:not(:disabled) { border-color: var(--pl-teal); background: var(--pl-teal-soft); color: var(--pl-teal-deep); }
.pl-btn-ghost:disabled { opacity: 0.45; cursor: default; }

/* 文字リンク相当の小さな操作 */
.pl-btn-text {
  min-height: 32px;
  padding: 0 0.5rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--pl-ink-soft);
  text-decoration: underline;
  cursor: pointer;
}
.pl-btn-text:hover { color: var(--pl-ink); }

/* 切り替え（キキガキのタグの絞り込みと同じ形） */
.pl-tab {
  flex: none;
  height: 32px;
  padding: 0 1rem;
  border: 1px solid var(--pl-line);
  border-radius: 999px;
  background: var(--pl-card);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--pl-ink-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.pl-tab:hover { border-color: var(--pl-teal); color: var(--pl-teal-deep); }
.pl-tab--on, .pl-tab--on:hover { background: var(--pl-teal); border-color: var(--pl-teal); color: #fff; }

.pl-chip {
  font-size: 11.5px;
  font-weight: 700;
  padding: 0.1rem 0.55rem;
  border-radius: 999px;
  border: 1px solid var(--pl-line);
  background: var(--pl-paper);
  color: var(--pl-ink-soft);
}

/* ── ロゴ ── */
.pl-logo { display: inline-flex; align-items: center; gap: 0.5rem; font-size: 17px; font-weight: 700; letter-spacing: 0.02em; color: var(--pl-ink); text-decoration: none; }
.pl-logo-mark { width: 28px; height: 28px; border-radius: 8px; background: var(--pl-vermilion); display: inline-flex; align-items: center; justify-content: center; }
.pl-logo-mark svg { width: 18px; height: 18px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

/* ── ポップアップ（ボトムシート。キキガキと同じ） ── */
.pl-sheet-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(40, 36, 28, 0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 200;
}
.pl-sheet-panel {
  background: var(--pl-card);
  width: 100%;
  max-width: 720px;
  max-height: 88vh;
  overflow-y: auto;
  border-radius: 14px 14px 0 0;
  padding: 0.25rem 1.1rem 1.5rem;
  box-shadow: 0 -8px 30px rgba(40, 36, 28, 0.18);
  animation: pl-sheet-up 0.25s ease-out both;
}
.pl-sheet-handle { width: 40px; height: 4px; border-radius: 999px; background: var(--pl-line-strong); margin: 0.4rem auto 0.5rem; }
.pl-sheet-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.6rem; }
.pl-sheet-close {
  width: 36px;
  height: 36px;
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 999px;
  font-size: 16px;
  color: var(--pl-ink-soft);
  cursor: pointer;
}
.pl-sheet-close:hover { background: var(--pl-teal-soft); color: var(--pl-ink); }
@keyframes pl-sheet-up { from { transform: translateY(100%); } to { transform: translateY(0); } }

@keyframes pl-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }
.pl-pulse { animation: pl-pulse 1.4s ease-in-out infinite; }

:focus-visible { outline: 2px solid var(--pl-teal); outline-offset: 2px; }
</style>
