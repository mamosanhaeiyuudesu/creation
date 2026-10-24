<template>
  <div class="am-root am-shell">
    <!-- PC の左サイドバー（キキガキ本番版と同じ作り）。スマホでは上のヘッダーに任せる -->
    <aside class="am-side">
      <NuxtLink to="/ai-manager" class="am-logo">
        <span class="am-logo-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3l2.2 4.6L19 9l-3.5 3.4.8 4.8L12 15l-4.3 2.2.8-4.8L5 9l4.8-1.4z" /></svg>
        </span>
        AI管理
      </NuxtLink>
      <nav class="am-side-nav">
        <NuxtLink v-for="n in NAV" :key="n.tab" :to="n.to" class="am-side-link" :class="{ 'is-active': activeTab === n.tab }">
          <svg viewBox="0 0 24 24" aria-hidden="true" v-html="n.icon" />
          {{ n.label }}
        </NuxtLink>
      </nav>
      <p class="am-note am-side-foot">どこで・どのモデルとプロンプトでAIを使ってきたか。git の履歴から作成。</p>
    </aside>

    <div class="am-shell-main">
      <header class="am-mobile-head">
        <NuxtLink to="/ai-manager" class="am-logo">
          <span class="am-logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M12 3l2.2 4.6L19 9l-3.5 3.4.8 4.8L12 15l-4.3 2.2.8-4.8L5 9l4.8-1.4z" /></svg>
          </span>
          AI管理
        </NuxtLink>
        <nav class="am-mobile-tabs">
          <NuxtLink v-for="n in NAV" :key="n.tab" :to="n.to" class="am-chip" :class="{ 'is-on': activeTab === n.tab }">{{ n.label }}</NuxtLink>
        </nav>
      </header>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// AI管理（/ai-manager）の一覧と詳細で共通の見た目。クラス接頭辞は am-。
// 色はグレー（slate）と水色（sky）のまま。フォント・文字の大きさ・面の作り・左サイドバーはキキガキ本番版
// （apps/production/kikigaki の kikigaki.css・layouts/default.vue）に合わせている（2026-10-24 の本人指示）。
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  ],
})

const route = useRoute()
const NAV = [
  { tab: 'timeline', label: '全体タイムライン', to: '/ai-manager', icon: '<path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="8" />' },
  { tab: 'list', label: '一覧', to: '/ai-manager?tab=list', icon: '<path d="M8 6h12M8 12h12M8 18h12" /><path d="M4 6h.01M4 12h.01M4 18h.01" />' },
] as const
// 詳細ページ（/ai-manager/site）ではどちらも選ばない
const activeTab = computed(() => (route.path !== '/ai-manager' ? null : route.query.tab === 'list' ? 'list' : 'timeline'))
</script>

<style>
/* 色の変数。Teleport でも抜けないよう :root に置く（キキガキと同じ理由） */
:root {
  --am-bg: #f8fafc;
  --am-panel: #ffffff;
  --am-line: #e2e8f0;
  --am-line-strong: #cbd5e1;
  --am-ink: #1e293b;
  --am-ink-soft: #475569;
  --am-ink-faint: #94a3b8;
  --am-accent: #0284c7;
  --am-accent-strong: #0369a1;
  --am-accent-soft: #e0f2fe;
  --am-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
}

/* ── 土台（キキガキの body と同じ） ── */
.am-root {
  min-height: 100dvh;
  color: var(--am-ink);
  background: var(--am-bg);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
.am-shell { display: flex; flex-direction: column; }
.am-shell-main { flex: 1; min-width: 0; }

/* ── 文字 ── */
.am-root .am-h1 { font-size: 20px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; margin: 0; }
.am-root .am-h2 { font-size: 15px; font-weight: 700; line-height: 1.5; margin: 0; }
.am-root .am-h3 { font-size: 13px; font-weight: 700; margin: 0 0 6px; color: var(--am-ink-soft); }
.am-root .am-note { font-size: 12px; color: var(--am-ink-faint); line-height: 1.7; }
.am-root p.am-note { margin-top: 0; margin-bottom: 0; }
.am-root .am-summary { margin: 6px 0 0; font-size: 15px; line-height: 1.75; color: var(--am-ink); }

/* ── ロゴ・サイドバー ── */
.am-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 17px;
  font-weight: 700;
  color: var(--am-accent);
  text-decoration: none;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
.am-logo-mark {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  background: var(--am-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.am-logo-mark svg { width: 17px; height: 17px; fill: none; stroke: #fff; stroke-width: 2; stroke-linejoin: round; }
.am-side { display: none; }
.am-mobile-head {
  padding: 0.6rem 0.9rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  background: var(--am-panel);
  border-bottom: 1px solid var(--am-line);
}
.am-mobile-tabs { display: flex; gap: 0.4rem; margin-left: auto; }
@media (min-width: 1024px) {
  .am-shell { flex-direction: row; }
  .am-side {
    width: 228px;
    flex: none;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 0.9rem 0.7rem 0.8rem;
    background: var(--am-panel);
    border-right: 1px solid var(--am-line);
    position: sticky;
    top: 0;
    height: 100dvh;
  }
  .am-side .am-logo { padding: 0.15rem 0.5rem; }
  .am-mobile-head { display: none; }
}
.am-side-nav { display: flex; flex-direction: column; gap: 2px; }
.am-side-link {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  font-size: 13.5px;
  color: var(--am-ink);
  text-decoration: none;
}
.am-side-link svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.am-side-link:hover { background: var(--am-bg); }
.am-side-link.is-active { background: var(--am-accent-soft); color: var(--am-accent-strong); font-weight: 700; }
.am-side-foot { margin-top: auto; padding: 0 0.6rem; }

/* ── ページの中身 ── */
.am-root .am-page { max-width: 1100px; margin: 0 auto; padding: 1rem 0.9rem 2.5rem; }
@media (min-width: 1024px) {
  .am-root .am-page { padding: 1.4rem 1.6rem 3rem; }
}
.am-root .am-page-head { margin-bottom: 1rem; }

/* ── 面（キキガキの kk-card） ── */
.am-root .am-card {
  background: var(--am-panel);
  border: 1px solid var(--am-line);
  border-radius: 10px;
  box-shadow: var(--am-shadow);
}

/* ── 押せるもの ── */
.am-root .am-btn-text {
  border: none;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: 13px;
  color: var(--am-accent-strong);
  cursor: pointer;
  text-decoration: none;
}
.am-root .am-btn-text:hover { text-decoration: underline; }
.am-root .am-chip {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 0.85rem;
  border: 1px solid var(--am-line-strong);
  border-radius: 999px;
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  background: var(--am-panel);
  color: var(--am-ink-soft);
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.am-root .am-chip:hover { border-color: var(--am-accent); color: var(--am-accent-strong); }
.am-root .am-chip.is-on { background: var(--am-accent); border-color: var(--am-accent); color: #fff; }
.am-root .am-btn {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding: 0 1rem;
  border: 1px solid var(--am-line-strong);
  border-radius: 999px;
  background: var(--am-panel);
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

/* ── 表（詰めた表） ── */
.am-root .am-table { width: 100%; border-collapse: collapse; min-width: 820px; }
.am-root .am-th {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  color: var(--am-ink-soft);
  background: var(--am-bg);
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--am-line);
  white-space: nowrap;
}
.am-root .am-td { padding: 0.6rem 0.75rem; vertical-align: top; border-bottom: 1px solid var(--am-line); }
.am-root .am-row { cursor: pointer; transition: background-color 0.12s; }
.am-root .am-row:hover { background: var(--am-accent-soft); }
.am-root li.am-row + li.am-row { border-top: 1px solid var(--am-line); }

/* ── 小さなラベル ── */
.am-root .am-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0 0.55rem;
  font-size: 11px;
  font-weight: 700;
  line-height: 19px;
  background: #e2e8f0;
  color: #334155;
  white-space: nowrap;
}
.am-root .am-badge[data-type='new'] { background: #dcfce7; color: #166534; }
.am-root .am-badge[data-type='model'] { background: #fef3c7; color: #92400e; }
.am-root .am-badge[data-type='options'] { background: #e0e7ff; color: #3730a3; }
.am-root .am-badge[data-type='prompt'] { background: #e0f2fe; color: #075985; }
.am-root .am-badge[data-type='removed'] { background: #fee2e2; color: #991b1b; }
.am-root .am-app {
  display: inline-block;
  border-radius: 6px;
  padding: 0 0.5rem;
  font-size: 11.5px;
  font-weight: 700;
  line-height: 20px;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}
.am-root .am-app[data-tool='kikigaki'] { background: #dbeafe; color: #1e40af; }
.am-root .am-app[data-tool='manabi'] { background: #dcfce7; color: #166534; }
.am-root .am-app[data-tool='nikki'] { background: #fef3c7; color: #92400e; }
.am-root .am-app[data-tool='miyako'] { background: #cffafe; color: #155e75; }
.am-root .am-app[data-tool='genogram'] { background: #fce7f3; color: #9d174d; }

/* ── 詳細の歴史 ── */
.am-root .am-dot { left: -23px; }
.am-root .am-opt-w { max-width: 220px; }
.am-root .am-day {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--am-bg);
  padding: 0.3rem 0;
  margin-bottom: 0.4rem;
  font-size: 13px;
  font-weight: 700;
  color: var(--am-ink-soft);
}

/* プロンプト。コードではなく文章として読めるように、等幅にせず折り返す */
.am-prose {
  padding: 0.85rem 1rem;
  background: var(--am-panel);
  border: 1px solid var(--am-line);
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--am-ink);
}
.am-prose-sub { background: var(--am-bg); font-size: 13px; color: var(--am-ink-soft); }
.am-prose-same { color: var(--am-ink-faint); }
.am-prose-skip { color: var(--am-line-strong); font-size: 12px; text-align: center; padding: 2px 0; }
.am-prose-changed { margin: 2px 0; }
.am-prose-changed.is-added { background: #ecfdf5; border-left: 3px solid #22c55e; padding-left: 8px; color: #14532d; }
.am-prose-changed.is-removed { background: #fef2f2; border-left: 3px solid #f87171; padding-left: 8px; color: #991b1b; text-decoration: line-through; text-decoration-color: #fca5a5; }
.am-ins-add { background: #bbf7d0; color: #14532d; border-radius: 2px; padding: 0 1px; }
.am-ins-del { background: #fee2e2; color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }

.am-root :focus-visible { outline: 2px solid var(--am-accent); outline-offset: 2px; }
</style>
