<template>
  <div class="fs-root">
    <slot />
  </div>
</template>

<script setup lang="ts">
// 見た目はキキガキ本番版（apps/production/kikigaki の kikigaki.css）に合わせている。
// 青を基調・オレンジは主役のボタンだけ・本文14px・詰めた表。クラス接頭辞は fs-。
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  ],
})
</script>

<style>
/* トースト等を Teleport しても色が抜けないよう、変数は :root に置く（キキガキと同じ理由）。
   他ツールと衝突しないよう --fs- で始める */
:root {
  --fs-bg: #f1f6fc;
  --fs-panel: #ffffff;
  --fs-line: #dbe4ef;
  --fs-line-strong: #b9c8da;
  --fs-ink: #1f2a37;
  --fs-ink-soft: #4b5868;
  --fs-ink-faint: #8593a3;
  --fs-accent: #1d6fd6;
  --fs-accent-strong: #134c9c;
  --fs-accent-soft: #e6f0fb;
  /* 主役ボタンのオレンジ。1画面に1つだけ */
  --fs-cta: #f08c1e;
  --fs-cta-strong: #d97606;
  --fs-cta-soft: #fff4e5;
  --fs-warn: #9a5b00;
  --fs-warn-soft: #fff4e5;
  --fs-danger: #c62828;
  --fs-danger-soft: #fdf1f1;
  --fs-plus: #2e7d32;
  --fs-plus-soft: #eef7ef;
  --fs-shadow: 0 2px 10px rgba(20, 60, 120, 0.06);
}

.fs-root {
  min-height: 100dvh;
  color: var(--fs-ink);
  background: var(--fs-bg);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}

/* ── 文字 ── */
.fs-h1 { font-size: 20px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; }
.fs-h2 { font-size: 15px; font-weight: 700; line-height: 1.5; }
.fs-lead { font-size: 14px; color: var(--fs-ink-soft); line-height: 1.8; }
.fs-note { font-size: 12px; color: var(--fs-ink-faint); line-height: 1.7; }
.fs-num { font-variant-numeric: tabular-nums; font-feature-settings: 'tnum'; }

/* ── 面 ── */
.fs-card {
  background: var(--fs-panel);
  border: 1px solid var(--fs-line);
  border-radius: 10px;
  box-shadow: var(--fs-shadow);
}
.fs-card-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--fs-line);
}
.fs-card-body { padding: 0.9rem 1rem; }

.fs-notice { border-radius: 8px; padding: 0.55rem 0.8rem; font-size: 13px; line-height: 1.7; }
.fs-notice--warn { background: var(--fs-warn-soft); border: 1px solid #f5d6ad; color: var(--fs-warn); }
.fs-notice--error { background: var(--fs-danger-soft); border: 1px solid #f0c2c2; color: var(--fs-danger); }
.fs-notice--info { background: var(--fs-accent-soft); border: 1px solid #c5dbf5; color: var(--fs-accent-strong); }

/* ── 押せるもの ── */
.fs-btn {
  min-height: 44px;
  padding: 0 1.25rem;
  border: none;
  border-radius: 999px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  background: var(--fs-cta);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  transition: background-color 0.15s;
}
.fs-btn:hover:not(:disabled) { background: var(--fs-cta-strong); }
.fs-btn:disabled { opacity: 0.45; cursor: default; }

.fs-btn-sub {
  min-height: 40px;
  padding: 0 1rem;
  border: 1px solid var(--fs-line-strong);
  border-radius: 999px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  color: var(--fs-ink);
  background: var(--fs-panel);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.fs-btn-sub:hover:not(:disabled) { border-color: var(--fs-accent); background: var(--fs-accent-soft); color: var(--fs-accent-strong); }
.fs-btn-sub:disabled { opacity: 0.45; cursor: default; }

.fs-btn-text {
  min-height: 32px;
  padding: 0 0.5rem;
  border: none;
  background: transparent;
  font-family: inherit;
  font-size: 13px;
  color: var(--fs-ink-soft);
  text-decoration: underline;
  cursor: pointer;
}
.fs-btn-text:hover { color: var(--fs-ink); }
.fs-btn-text.is-danger:hover { color: var(--fs-danger); }

/* 切り替え（キキガキのタグの絞り込みと同じ形） */
.fs-chip {
  flex: none;
  height: 28px;
  padding: 0 0.7rem;
  border: 1px solid var(--fs-line);
  border-radius: 999px;
  background: var(--fs-panel);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--fs-ink-soft);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.fs-chip:hover { border-color: var(--fs-accent); color: var(--fs-accent-strong); }
.fs-chip.is-on { background: var(--fs-accent); border-color: var(--fs-accent); color: #fff; }

/* ── 入力 ── */
.fs-input {
  width: 100%;
  background: #fff;
  border: 1px solid var(--fs-line);
  border-radius: 6px;
  padding: 0.35rem 0.6rem;
  font-family: inherit;
  font-size: 16px; /* 16px未満にするとiOSが勝手にズームする（PCだけ下で詰める） */
  line-height: 1.6;
  color: var(--fs-ink);
  transition: border-color 0.15s;
}
.fs-input::placeholder { color: var(--fs-ink-faint); }
.fs-input:focus { outline: none; border-color: var(--fs-accent); box-shadow: 0 0 0 3px var(--fs-accent-soft); }
.fs-input--warn { border-color: #e0b062; background: #fffaf0; }
@media (min-width: 768px) {
  .fs-input { font-size: 14px; }
}
.fs-field-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--fs-ink-soft);
  margin-bottom: 0.2rem;
}

/* ── 表（1行を低くして一度にたくさん見せる） ── */
.fs-table { width: 100%; border-collapse: collapse; }
.fs-table th {
  padding: 0.4rem 0.75rem;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--fs-ink-faint);
  text-align: right;
  background: #f8fafd;
  border-bottom: 1px solid var(--fs-line);
  white-space: nowrap;
}
.fs-table th:first-child { text-align: left; }
.fs-table td {
  padding: 0.5rem 0.75rem;
  font-size: 13px;
  color: var(--fs-ink-soft);
  text-align: right;
  border-bottom: 1px solid var(--fs-line);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.fs-table td:first-child { text-align: left; color: var(--fs-ink); }
.fs-table tbody tr:last-child td { border-bottom: 0; }

:focus-visible { outline: 2px solid var(--fs-accent); outline-offset: 2px; }
</style>
