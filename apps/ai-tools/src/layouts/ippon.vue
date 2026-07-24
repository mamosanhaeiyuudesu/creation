<template>
  <div class="ippon-root min-h-screen w-full">
    <div class="ippon-bg" aria-hidden="true">
      <div class="ippon-bg__grid" />
      <div class="ippon-bg__glow" />
    </div>
    <div class="relative z-[1]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// 3Dビューは Google の <model-viewer>（Web Component）をCDNからモジュール読込する。
// Google Fonts と同じくCDN依存で軽く済ませる（three.js を直接束ねない）。
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap',
    },
  ],
  script: [
    {
      type: 'module',
      src: 'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js',
    },
  ],
})
</script>

<style>
.ippon-root {
  /* 工房 / 設計図トーン（ダーク＋シアンの罫線） */
  --ip-bg: #0b1016;
  --ip-bg-2: #0e151d;
  --ip-panel: #131c26;
  --ip-panel-2: #182430;
  --ip-line: #24333f;
  --ip-ink: #e8eef3;
  --ip-ink-soft: #93a4b1;
  --ip-ink-faint: #5f7180;

  --ip-accent: #38bdf8; /* sky-400 */
  --ip-accent-deep: #0ea5e9;
  --ip-accent-soft: #7dd3fc;
  --ip-amber: #f5b544;
  --ip-warn: #fbbf24;

  position: relative;
  color: var(--ip-ink);
  background: var(--ip-bg);
  font-family: 'Zen Kaku Gothic New', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.ippon-display {
  font-family: 'Space Grotesk', 'Zen Kaku Gothic New', sans-serif;
  letter-spacing: 0.01em;
}

.ippon-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, var(--ip-bg) 0%, var(--ip-bg-2) 100%);
}
.ippon-bg__grid {
  position: absolute;
  inset: 0;
  opacity: 0.4;
  background-image:
    linear-gradient(rgba(56, 189, 248, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.05) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(120% 80% at 50% 0%, #000 40%, transparent 100%);
}
.ippon-bg__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 40% at 50% -5%, rgba(56, 189, 248, 0.12) 0%, transparent 70%);
}

/* 共通部品 */
.ip-card {
  background: var(--ip-panel);
  border: 1px solid var(--ip-line);
  border-radius: 16px;
}
.ip-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--ip-line);
  border-radius: 12px;
  padding: 0.55rem 0.85rem;
  font-size: 14px;
  color: var(--ip-ink);
  width: 100%;
}
.ip-input::placeholder { color: var(--ip-ink-faint); }
.ip-input:focus { outline: none; border-color: var(--ip-accent); }

.ip-btn {
  height: 2.6rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #04121c;
  background: var(--ip-accent);
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
}
.ip-btn:hover { background: var(--ip-accent-soft); }
.ip-btn:active { transform: translateY(1px); }
.ip-btn:disabled { opacity: 0.4; cursor: default; }

.ip-btn-ghost {
  height: 2.6rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: var(--ip-ink-soft);
  border: 1px solid var(--ip-line);
  background: rgba(255, 255, 255, 0.02);
  transition: all 0.15s;
}
.ip-btn-ghost:hover { border-color: var(--ip-accent); color: var(--ip-ink); }

.ip-chip {
  font-size: 12.5px;
  font-weight: 700;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--ip-line);
  background: rgba(255, 255, 255, 0.02);
  color: var(--ip-ink-soft);
  transition: all 0.15s;
}
.ip-chip--on {
  background: color-mix(in srgb, var(--ip-accent) 22%, transparent);
  border-color: var(--ip-accent);
  color: var(--ip-accent-soft);
}

@keyframes ip-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.ip-rise { animation: ip-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
