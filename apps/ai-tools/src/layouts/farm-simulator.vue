<template>
  <div class="fsr-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 見た目はキキガキ本番版（apps/production/kikigaki の kikigaki.css）に合わせている。
// 青を基調・オレンジは主役のボタンだけ・本文14px・詰めた表。クラス接頭辞は fsr-（farm-simulation の fs- と分けている）。スマホで読みやすいよう、本文は15px・数字の見出しは大きめ。
useHead({
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/icon-farm-simulator.svg' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-farm-simulation.png' },
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  ],
})
</script>

<style>
/* トースト等を Teleport しても色が抜けないよう、変数は :root に置く（キキガキと同じ理由）。
   他ツールと衝突しないよう --fsr- で始める */
:root {
  --fsr-bg: #f1f6fc;
  --fsr-panel: #ffffff;
  --fsr-line: #dbe4ef;
  --fsr-line-strong: #b9c8da;
  --fsr-ink: #1f2a37;
  --fsr-ink-soft: #4b5868;
  --fsr-ink-faint: #8593a3;
  --fsr-accent: #1d6fd6;
  --fsr-accent-strong: #134c9c;
  --fsr-accent-soft: #e6f0fb;
  /* 主役ボタンのオレンジ。1画面に1つだけ */
  --fsr-cta: #f08c1e;
  --fsr-cta-strong: #d97606;
  --fsr-cta-soft: #fff4e5;
  --fsr-warn: #9a5b00;
  --fsr-warn-soft: #fff4e5;
  --fsr-danger: #c62828;
  --fsr-danger-soft: #fdf1f1;
  --fsr-plus: #2e7d32;
  --fsr-plus-soft: #eef7ef;
  --fsr-shadow: 0 2px 10px rgba(20, 60, 120, 0.06);
  /* グラフ: 見通し＝青（地の色と同じ系統）、過去の年＝灰、今季の実績＝墨 */
  --fsr-band: rgba(29, 111, 214, 0.16);
  --fsr-past: #a9b6c6;
}

.fsr-root {
  min-height: 100dvh;
  color: var(--fsr-ink);
  background: var(--fsr-bg);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 15px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}
@media (min-width: 1024px) {
  .fsr-root { font-size: 14px; }
}

/* ── 文字 ── */
.fsr-h1 { font-size: 20px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; }
.fsr-h2 { font-size: 15px; font-weight: 700; line-height: 1.5; }
.fsr-lead { font-size: 14px; color: var(--fsr-ink-soft); line-height: 1.8; }
.fsr-note { font-size: 12px; color: var(--fsr-ink-faint); line-height: 1.7; }
.fsr-num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }

/* ── 面 ── */
.fsr-card {
  background: var(--fsr-panel);
  border: 1px solid var(--fsr-line);
  border-radius: 10px;
  box-shadow: var(--fsr-shadow);
}
.fsr-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--fsr-line);
}
.fsr-card-body { padding: 0.9rem 1rem; }

.fsr-notice { border-radius: 8px; padding: 0.55rem 0.8rem; font-size: 13px; line-height: 1.7; }
.fsr-notice--warn { background: var(--fsr-warn-soft); border: 1px solid #f5d6ad; color: var(--fsr-warn); }
.fsr-notice--error { background: var(--fsr-danger-soft); border: 1px solid #f0c2c2; color: var(--fsr-danger); }
.fsr-notice--info { background: var(--fsr-accent-soft); border: 1px solid #c5dbf5; color: var(--fsr-accent-strong); }

/* ── 押せるもの ── */
.fsr-btn {
  min-height: 44px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--fsr-cta);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.fsr-btn:hover:not(:disabled) { background: var(--fsr-cta-strong); }
.fsr-btn:disabled { opacity: 0.45; cursor: default; }

.fsr-btn-sub {
  min-height: 40px;
  padding: 0 1rem;
  border: 1px solid var(--fsr-line-strong);
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--fsr-ink);
  background: var(--fsr-panel);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.fsr-btn-sub:hover:not(:disabled) { border-color: var(--fsr-accent); background: var(--fsr-accent-soft); color: var(--fsr-accent-strong); }
.fsr-btn-sub:disabled { opacity: 0.45; cursor: default; }

.fsr-btn-text {
  min-height: 32px;
  padding: 0 0.5rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--fsr-ink-soft);
  text-decoration: underline;
  cursor: pointer;
}
.fsr-btn-text:hover { color: var(--fsr-ink); }
.fsr-btn-text.is-danger:hover { color: var(--fsr-danger); }

/* 切り替え（キキガキのタグの絞り込みと同じ形） */
.fsr-chip {
  flex: none;
  height: 28px;
  padding: 0 0.7rem;
  border: 1px solid var(--fsr-line);
  border-radius: 999px;
  background: var(--fsr-panel);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--fsr-ink-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.fsr-chip:hover { border-color: var(--fsr-accent); color: var(--fsr-accent-strong); }
.fsr-chip.is-on { background: var(--fsr-accent); border-color: var(--fsr-accent); color: #fff; }

/* ── 入力 ── */
.fsr-input {
  width: 100%;
  background: #fff;
  border: 1px solid var(--fsr-line);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-family: inherit;
  font-size: 16px; /* 16px未満にするとiOSが勝手にズームする（PCだけ下で詰める） */
  line-height: 1.6;
  color: var(--fsr-ink);
  transition: border-color 0.15s;
}
.fsr-input::placeholder { color: var(--fsr-ink-faint); }
.fsr-input:focus { outline: none; border-color: var(--fsr-accent); box-shadow: 0 0 0 3px var(--fsr-accent-soft); }
.fsr-input--warn { border-color: #e0b062; background: #fffaf0; }
@media (min-width: 768px) {
  .fsr-input { font-size: 14px; }
}
.fsr-field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--fsr-ink-soft);
  margin-bottom: 0.2rem;
}

/* ── 表（1行を低くして一度にたくさん見せる） ── */
.fsr-table { width: 100%; border-collapse: collapse; }
.fsr-table th {
  padding: 0.4rem 0.75rem;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--fsr-ink-faint);
  text-align: right;
  background: #f8fafd;
  border-bottom: 1px solid var(--fsr-line);
  white-space: nowrap;
}
.fsr-table th:first-child { text-align: left; }
.fsr-table td {
  padding: 0.5rem 0.75rem;
  font-size: 13px;
  color: var(--fsr-ink-soft);
  text-align: right;
  border-bottom: 1px solid var(--fsr-line);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fsr-table td:first-child { text-align: left; color: var(--fsr-ink); }
.fsr-table tbody tr:last-child td { border-bottom: 0; }

:focus-visible { outline: 2px solid var(--fsr-accent); outline-offset: 2px; }
</style>
