<template>
  <div class="kk-root min-h-[100dvh] w-full">
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Shippori+Mincho:wght@600&display=swap',
    },
  ],
})
</script>

<style>
.kk-root {
  /* 公民館の机の上のような、事務的だが硬すぎないトーン */
  --kk-bg: #f4f2ed;
  --kk-panel: #ffffff;
  --kk-line: rgba(40, 44, 52, 0.12);
  --kk-line-strong: rgba(40, 44, 52, 0.26);
  --kk-ink: #2b3038;
  --kk-ink-soft: #6b7280;
  --kk-ink-faint: #9aa1ab;
  --kk-accent: #2f6f5e;
  --kk-accent-soft: #dcebe5;
  --kk-warn: #b45309;
  --kk-warn-soft: #fdf3e3;
  --kk-danger: #b91c1c;

  color: var(--kk-ink);
  background: var(--kk-bg);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.kk-display {
  font-family: 'Shippori Mincho', 'Hiragino Mincho ProN', serif;
  letter-spacing: 0.04em;
}

.kk-card {
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 14px;
}

.kk-btn {
  height: 2.5rem;
  padding: 0 1.25rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13.5px;
  color: #fff;
  background: var(--kk-accent);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-decoration: none;
  cursor: pointer;
  transition: opacity 0.15s;
}
.kk-btn:hover:not(:disabled) { opacity: 0.88; }
.kk-btn:disabled { opacity: 0.4; cursor: default; }

.kk-btn-ghost {
  height: 2.25rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--kk-ink-soft);
  border: 1px solid var(--kk-line);
  background: transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  text-decoration: none;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}
.kk-btn-ghost:hover:not(:disabled) { border-color: var(--kk-line-strong); color: var(--kk-ink); }
.kk-btn-ghost:disabled { opacity: 0.4; cursor: default; }

.kk-input {
  background: #fff;
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--kk-ink);
  width: 100%;
  transition: border-color 0.15s;
}
.kk-input::placeholder { color: var(--kk-ink-faint); }
.kk-input:focus { outline: none; border-color: var(--kk-accent); }

.kk-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--kk-ink-soft);
  letter-spacing: 0.02em;
}

.kk-tag {
  display: inline-flex;
  align-items: center;
  height: 1.35rem;
  padding: 0 0.5rem;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.kk-tag--draft { background: #eef1f4; color: var(--kk-ink-soft); }
.kk-tag--approved { background: var(--kk-accent-soft); color: var(--kk-accent); }
</style>
