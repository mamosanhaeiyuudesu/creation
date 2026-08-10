<template>
  <div class="keiko-root min-h-screen w-full">
    <div class="keiko-bg" aria-hidden="true" />
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
      href: 'https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&family=Zen+Maru+Gothic:wght@400;500;700&display=swap',
    },
  ],
})
</script>

<style>
.keiko-root {
  /* 道場の紺＋金の落款、といったパレット */
  --keiko-navy: #1c2540;
  --keiko-navy-deep: #10152a;
  --keiko-paper: #f6f4ee;
  --keiko-card: #ffffff;
  --keiko-ink: #23283a;
  --keiko-ink-soft: #7a7d8c;
  --keiko-line: #e6e2d8;

  --keiko-gold: #c9a227;
  --keiko-gold-soft: #e7cf7c;
  --keiko-hanamaru: #e0524b;
  --keiko-hanamaru-soft: #f7d9d6;

  position: relative;
  color: var(--keiko-ink);
  background: var(--keiko-paper);
  font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.keiko-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 60% at 50% -10%, rgba(28, 37, 64, 0.06) 0%, transparent 60%),
    linear-gradient(180deg, var(--keiko-paper) 0%, #f1eee4 100%);
}

.keiko-display {
  font-family: 'Shippori Mincho', 'Zen Maru Gothic', serif;
}

.keiko-btn {
  height: 2.4rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13.5px;
  color: #fff;
  background: var(--keiko-navy);
  transition: opacity 0.15s, transform 0.1s;
}
.keiko-btn:hover { opacity: 0.9; }
.keiko-btn:active { transform: scale(0.97); }
.keiko-btn:disabled { opacity: 0.35; }

.keiko-btn-ghost {
  height: 2.4rem;
  padding: 0 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: var(--keiko-ink-soft);
  border: 1px solid var(--keiko-line);
  background: var(--keiko-card);
}
.keiko-btn-ghost:hover { border-color: var(--keiko-gold-soft); color: var(--keiko-ink); }

.keiko-input {
  background: var(--keiko-card);
  border: 1px solid var(--keiko-line);
  border-radius: 10px;
  padding: 0.5rem 0.8rem;
  font-size: 14px;
  color: var(--keiko-ink);
  width: 100%;
}
.keiko-input:focus { outline: none; border-color: var(--keiko-gold); }

@keyframes keiko-pop {
  0% { transform: scale(0.4); opacity: 0; }
  60% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.keiko-pop { animation: keiko-pop 0.28s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
