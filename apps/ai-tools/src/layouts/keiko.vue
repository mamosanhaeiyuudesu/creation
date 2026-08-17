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
    // 子どもが読みやすい丸ゴシック。見出しはポップ体（Mochiy Pop One）で楽しく。
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&family=Zen+Maru+Gothic:wght@400;500;700&display=swap',
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
  /* 面・竹刀・足あとをうっすら敷いた道場の床 */
  background-image:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'%3E%3Cg fill='%231c2540' opacity='0.03'%3E%3Cpath d='M22 14c-5 0-7.5 3.6-7.5 10 0 4.4 1.2 8.2 2.5 10 1 1.3 2.5 1.9 5 1.9s4-.6 5-1.9c1.3-1.8 2.5-5.6 2.5-10 0-6.4-2.5-10-7.5-10Z'/%3E%3Crect x='112' y='96' width='3' height='24' rx='1.5' transform='rotate(-35 113.5 108)'/%3E%3Cellipse cx='124' cy='28' rx='3' ry='4.2' transform='rotate(-15 124 28)'/%3E%3Cellipse cx='130' cy='38' rx='3' ry='4.2' transform='rotate(-15 130 38)'/%3E%3Cellipse cx='40' cy='118' rx='3' ry='4.2' transform='rotate(14 40 118)'/%3E%3Cellipse cx='47' cy='128' rx='3' ry='4.2' transform='rotate(14 47 128)'/%3E%3C/g%3E%3C/svg%3E"),
    radial-gradient(90% 60% at 50% -10%, rgba(28, 37, 64, 0.06) 0%, transparent 60%),
    linear-gradient(180deg, var(--keiko-paper) 0%, #f1eee4 100%);
  background-size: 160px 160px, auto, auto;
}

.keiko-display {
  font-family: 'Mochiy Pop One', 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', sans-serif;
  font-weight: 400;
  letter-spacing: 0.01em;
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
.keiko-btn-ghost:disabled { opacity: 0.35; }
.keiko-btn-ghost:disabled:hover { border-color: var(--keiko-line); color: var(--keiko-ink-soft); }

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
