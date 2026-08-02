<template>
  <div class="la-root min-h-[100dvh] w-full">
    <div class="la-bg" aria-hidden="true">
      <div class="la-bg__shadow" />
      <div class="la-bg__light" />
      <div class="la-bg__grain" />
    </div>
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
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Shippori+Mincho:wght@500;600&display=swap',
    },
  ],
})
</script>

<style>
.la-root {
  /* 夜明け前の色。左（影）＝藍、右（光）＝金。 */
  --la-bg: #0a0d16;
  --la-panel: rgba(255, 255, 255, 0.035);
  --la-panel-solid: #141827;
  --la-line: rgba(255, 255, 255, 0.09);
  --la-line-strong: rgba(255, 255, 255, 0.18);
  --la-ink: #e9edf8;
  --la-ink-soft: #98a2bb;
  --la-ink-faint: #66708a;

  --la-shadow: #7c83f5;
  --la-shadow-deep: #4b52c4;
  --la-shadow-soft: #a9adfb;
  --la-light: #f0b544;
  --la-light-deep: #c78d21;
  --la-light-soft: #f7d38b;

  position: relative;
  color: var(--la-ink);
  background: var(--la-bg);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.la-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: linear-gradient(180deg, #0a0d16 0%, #0c1020 60%, #090c14 100%);
}
.la-bg__shadow {
  position: absolute;
  inset: 0;
  background: radial-gradient(70% 60% at 8% 40%, rgba(90, 98, 220, 0.16) 0%, transparent 62%);
}
.la-bg__light {
  position: absolute;
  inset: 0;
  background: radial-gradient(70% 60% at 92% 40%, rgba(230, 170, 60, 0.13) 0%, transparent 62%);
}
.la-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.35;
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1.4px);
  background-size: 4px 4px;
}

.la-display {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  letter-spacing: 0.04em;
}

/* 共通パーツ */
.la-card {
  background: var(--la-panel);
  border: 1px solid var(--la-line);
  border-radius: 16px;
}

.la-input {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--la-line);
  border-radius: 12px;
  padding: 0.6rem 0.8rem;
  font-size: 13.5px;
  line-height: 1.75;
  color: var(--la-ink);
  width: 100%;
  transition: border-color 0.15s;
}
.la-input::placeholder { color: var(--la-ink-faint); }
.la-input:focus { outline: none; border-color: var(--la-shadow); }

.la-btn {
  height: 2.5rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13.5px;
  color: #0a0d16;
  background: linear-gradient(100deg, var(--la-shadow-soft) 0%, var(--la-light-soft) 100%);
  transition: opacity 0.15s, transform 0.15s;
}
.la-btn:hover:not(:disabled) { opacity: 0.88; }
.la-btn:disabled { opacity: 0.35; cursor: default; }

.la-btn-ghost {
  height: 2.25rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--la-ink-soft);
  border: 1px solid var(--la-line);
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.15s, color 0.15s;
}
.la-btn-ghost:hover:not(:disabled) { border-color: var(--la-line-strong); color: var(--la-ink); }
.la-btn-ghost:disabled { opacity: 0.35; cursor: default; }

.la-tab {
  flex: 1;
  height: 2.1rem;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--la-ink-faint);
  transition: background 0.15s, color 0.15s;
}
.la-tab--on {
  background: rgba(255, 255, 255, 0.07);
  color: var(--la-ink);
}

@keyframes la-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.la-rise { animation: la-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }

/* スクロールバー（サイドバー・ポップアップ用） */
.la-scroll::-webkit-scrollbar { width: 8px; }
.la-scroll::-webkit-scrollbar-track { background: transparent; }
.la-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 999px; }
.la-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.18); }
</style>
