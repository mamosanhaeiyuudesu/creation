<template>
  <div class="am-root min-h-screen bg-slate-50 text-slate-800">
    <slot />
  </div>
</template>

<script setup lang="ts">
// AI管理（/ai-manager）の一覧と詳細で共通の見た目。クラス接頭辞は am-。
</script>

<style>
.am-root .am-input {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 4px 8px;
  background: #fff;
  font-size: 13px;
}
.am-root .am-btn {
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  padding: 6px 12px;
  background: #fff;
  font-size: 13px;
}
.am-root .am-th {
  text-align: left;
  font-weight: 600;
  padding: 6px 10px;
}
.am-root .am-td {
  padding: 8px 10px;
  vertical-align: top;
}
.am-root .am-chip {
  border: 1px solid #cbd5e1;
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 12px;
  background: #fff;
  color: #475569;
}
.am-root .am-chip.is-on {
  background: #0284c7;
  border-color: #0284c7;
  color: #fff;
}
.am-root .am-badge {
  display: inline-block;
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
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
  border-radius: 3px;
  padding: 0 6px;
  font-size: 11px;
  line-height: 18px;
  background: #f1f5f9;
  color: #475569;
  white-space: nowrap;
}
.am-root .am-app-sm { font-size: 10px; line-height: 15px; padding: 0 4px; }
.am-root .am-app[data-tool='kikigaki'] { background: #dbeafe; color: #1e40af; }
.am-root .am-app[data-tool='manabi'] { background: #dcfce7; color: #166534; }
.am-root .am-app[data-tool='nikki'] { background: #fef3c7; color: #92400e; }
.am-root .am-app[data-tool='miyako'] { background: #cffafe; color: #155e75; }
.am-root .am-app[data-tool='genogram'] { background: #fce7f3; color: #9d174d; }
.am-root .am-model-label { flex: 0 0 32%; min-width: 0; }
.am-root .am-model-axis { margin-left: calc(32% + 8px); }
@media (max-width: 639px) {
  .am-root .am-model-label { flex-basis: 40%; }
  .am-root .am-model-axis { margin-left: calc(40% + 8px); }
}
/* Tailwind の任意値（max-w-[1200px] など）の代わり。dev 中に作ったファイルの任意値を JIT が拾わないことがあったため */
.am-root .am-wrap { max-width: 1200px; }
.am-root .am-wrap-sm { max-width: 1100px; }
.am-root .am-dl { grid-template-columns: 7em 1fr; }
.am-root .am-dot { left: -23px; }
.am-root .am-opt-w { max-width: 220px; }
.am-root .am-table-w { min-width: 820px; }
.am-root .am-text-10 { font-size: 10px; }
.am-z-modal { z-index: 1000; }
.am-modal-w { max-width: 900px; }
.am-modal-h { max-height: 90vh; }

/* プロンプト。コードではなく文章として読めるように、等幅にせず折り返す */
.am-root .am-h3 { font-size: 13px; font-weight: 700; margin: 0 0 6px; }
.am-prose {
  padding: 12px 14px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  line-height: 1.85;
  white-space: pre-wrap;
  word-break: break-word;
  color: #1e293b;
}
.am-prose-sub { background: #f8fafc; font-size: 13px; color: #334155; }
.am-root .am-summary { margin: 6px 0 0; font-size: 15px; line-height: 1.7; color: #0f172a; }
.am-prose-same { color: #94a3b8; }
.am-prose-skip { color: #cbd5e1; font-size: 12px; text-align: center; padding: 2px 0; }
.am-prose-changed { margin: 2px 0; }
.am-prose-changed.is-added { background: #ecfdf5; border-left: 3px solid #22c55e; padding-left: 8px; color: #14532d; }
.am-prose-changed.is-removed { background: #fef2f2; border-left: 3px solid #f87171; padding-left: 8px; color: #991b1b; text-decoration: line-through; text-decoration-color: #fca5a5; }
.am-ins-add { background: #bbf7d0; color: #14532d; border-radius: 2px; padding: 0 1px; }
.am-ins-del { background: #fee2e2; color: #b91c1c; text-decoration: line-through; border-radius: 2px; padding: 0 1px; }
.am-root .am-details { border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; padding: 6px 10px; }
.am-root .am-details > summary { cursor: pointer; font-size: 13px; color: #475569; }
.am-root .am-details[open] > summary { margin-bottom: 8px; }
</style>
