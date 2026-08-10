<template>
  <div class="lf-root min-h-[100dvh] w-full">
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
.lf-root {
  /* 生成りの紙のような、落ち着いたトーン */
  --lf-bg: #faf6f0;
  --lf-panel: #ffffff;
  --lf-line: rgba(58, 51, 44, 0.1);
  --lf-line-strong: rgba(58, 51, 44, 0.2);
  --lf-ink: #3a332c;
  --lf-ink-soft: #7a6f62;
  --lf-ink-faint: #a89d8e;
  --lf-accent: #c07a4a;
  --lf-accent-soft: #e8c9ac;

  color: var(--lf-ink);
  background: var(--lf-bg);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.lf-display {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  letter-spacing: 0.03em;
}

.lf-card {
  background: var(--lf-panel);
  border: 1px solid var(--lf-line);
  border-radius: 16px;
}

.lf-btn {
  height: 2.5rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13.5px;
  color: #fff;
  background: var(--lf-accent);
  transition: opacity 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.lf-btn:hover:not(:disabled) { opacity: 0.88; }
.lf-btn:disabled { opacity: 0.4; cursor: default; }

.lf-btn-ghost {
  height: 2.25rem;
  padding: 0 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--lf-ink-soft);
  border: 1px solid var(--lf-line);
  background: transparent;
  transition: border-color 0.15s, color 0.15s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  cursor: pointer;
}
.lf-btn-ghost:hover:not(:disabled) { border-color: var(--lf-line-strong); color: var(--lf-ink); }

.lf-input {
  background: #fff;
  border: 1px solid var(--lf-line);
  border-radius: 12px;
  padding: 0.7rem 0.9rem;
  font-size: 14px;
  line-height: 1.7;
  color: var(--lf-ink);
  width: 100%;
  transition: border-color 0.15s;
}
.lf-input::placeholder { color: var(--lf-ink-faint); }
.lf-input:focus { outline: none; border-color: var(--lf-accent); }

@keyframes lf-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.lf-rise { animation: lf-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
