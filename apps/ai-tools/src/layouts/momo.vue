<template>
  <div class="momo-root min-h-screen w-full">
    <div class="momo-bg" aria-hidden="true">
      <div class="momo-bg__glow" />
      <div class="momo-bg__grain" />
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
      href: 'https://fonts.googleapis.com/css2?family=Zen+Maru+Gothic:wght@400;500;700;900&family=Kiwi+Maru:wght@400;500&display=swap',
    },
  ],
})
</script>

<style>
.momo-root {
  /* 桃のパレット（やわらかな桃色＋葉の緑） */
  --momo-paper: #fdf5f3;
  --momo-paper-2: #f9e7e4;
  --momo-card: #fffdfc;
  --momo-ink: #4a2f34;
  --momo-ink-soft: #9c757c;
  --momo-line: #f1dcd8;

  --momo-peach: #ec8199;
  --momo-peach-deep: #d5647f;
  --momo-peach-soft: #f6b0c1;
  --momo-leaf: #8aab6b;
  --momo-leaf-soft: #b3ca94;
  --momo-amber: #e2a24d;
  --momo-warn: #eab308; /* 要確認ハイライト（黄） */

  position: relative;
  color: var(--momo-ink);
  background: var(--momo-paper);
  font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.momo-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 12% -10%, #fff2f5 0%, transparent 55%),
    radial-gradient(120% 100% at 100% 0%, #fce0d6 0%, transparent 50%),
    linear-gradient(180deg, var(--momo-paper) 0%, var(--momo-paper-2) 100%);
}
.momo-bg__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 40% at 50% 8%, rgba(236, 129, 153, 0.10) 0%, transparent 70%);
}
.momo-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image: radial-gradient(rgba(150, 90, 90, 0.05) 1px, transparent 1.4px);
  background-size: 4px 4px;
}

.momo-display {
  font-family: 'Kiwi Maru', 'Zen Maru Gothic', serif;
}

/* 共通のフォーム部品 */
.momo-input {
  background: var(--momo-card);
  border: 1px solid var(--momo-line);
  border-radius: 12px;
  padding: 0.5rem 0.8rem;
  font-size: 14px;
  color: var(--momo-ink);
  width: 100%;
}
.momo-input::placeholder { color: color-mix(in srgb, var(--momo-ink-soft) 65%, transparent); }
.momo-input:focus { outline: none; border-color: var(--momo-peach); }

.momo-input--warn {
  border-color: var(--momo-warn);
  background: #fffbe8;
}

.momo-btn {
  height: 2.5rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: var(--momo-peach);
  transition: background 0.15s, opacity 0.15s;
}
.momo-btn:hover { background: var(--momo-peach-deep); }
.momo-btn:disabled { opacity: 0.4; }

.momo-btn-ghost {
  height: 2.5rem;
  padding: 0 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: var(--momo-ink-soft);
  border: 1px solid var(--momo-line);
  background: var(--momo-card);
}
.momo-btn-ghost:hover { border-color: var(--momo-peach-soft); }

.momo-chip {
  font-size: 12.5px;
  font-weight: 700;
  padding: 0.42rem 0.8rem;
  border-radius: 999px;
  border: 1px solid var(--momo-line);
  background: var(--momo-card);
  color: var(--momo-ink-soft);
  transition: all 0.15s;
}
.momo-chip--on {
  background: var(--momo-peach);
  border-color: var(--momo-peach);
  color: #fff;
}

@keyframes momo-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.momo-rise { animation: momo-rise 0.45s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
