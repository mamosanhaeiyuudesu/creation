<template>
  <div class="gh-root min-h-screen w-full">
    <div class="gh-bg" aria-hidden="true">
      <div class="gh-bg__glow" />
      <div class="gh-bg__grain" />
    </div>
    <div class="relative z-[1]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
// 里山・木のぬくもりトーン。柿畑／高野口の宿の落ち着いた自然色でまとめる。
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700&family=Zen+Old+Mincho:wght@500;700&display=swap',
    },
  ],
})
</script>

<style>
.gh-root {
  /* 里山のパレット（生成りの和紙＋杉・柿・苔） */
  --gh-paper: #f7f3ea;
  --gh-paper-2: #efe7d6;
  --gh-card: #fffdf8;
  --gh-ink: #3a352c;
  --gh-ink-soft: #8c8271;
  --gh-ink-faint: #b3a992;
  --gh-line: #e7ddc9;

  --gh-forest: #5f7a52;      /* 苔・杉の緑（主アクセント） */
  --gh-forest-deep: #4a6340;
  --gh-forest-soft: #8fa87f;
  --gh-persimmon: #d98a4e;   /* 柿色（副アクセント） */
  --gh-persimmon-soft: #edb589;
  --gh-warn: #c98a2b;        /* 要確認・引き継ぎ */

  position: relative;
  color: var(--gh-ink);
  background: var(--gh-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.gh-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 10% -10%, #fbf7ee 0%, transparent 55%),
    radial-gradient(120% 100% at 100% 0%, #e9edda 0%, transparent 50%),
    linear-gradient(180deg, var(--gh-paper) 0%, var(--gh-paper-2) 100%);
}
.gh-bg__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 40% at 50% 6%, rgba(95, 122, 82, 0.10) 0%, transparent 70%);
}
.gh-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image: radial-gradient(rgba(120, 100, 70, 0.05) 1px, transparent 1.4px);
  background-size: 4px 4px;
}

.gh-display {
  font-family: 'Zen Old Mincho', 'Hiragino Mincho ProN', serif;
  letter-spacing: 0.01em;
}

/* 共通フォーム部品 */
.gh-input {
  background: var(--gh-card);
  border: 1px solid var(--gh-line);
  border-radius: 12px;
  padding: 0.55rem 0.85rem;
  font-size: 14px;
  color: var(--gh-ink);
  width: 100%;
}
.gh-input::placeholder { color: color-mix(in srgb, var(--gh-ink-soft) 60%, transparent); }
.gh-input:focus { outline: none; border-color: var(--gh-forest); }

.gh-btn {
  height: 2.6rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: #fff;
  background: var(--gh-forest);
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
}
.gh-btn:hover { background: var(--gh-forest-deep); }
.gh-btn:active { transform: translateY(1px); }
.gh-btn:disabled { opacity: 0.4; cursor: default; }

.gh-btn-ghost {
  height: 2.6rem;
  padding: 0 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 13px;
  color: var(--gh-ink-soft);
  border: 1px solid var(--gh-line);
  background: var(--gh-card);
  transition: all 0.15s;
}
.gh-btn-ghost:hover { border-color: var(--gh-forest-soft); color: var(--gh-ink); }

.gh-chip {
  font-size: 12px;
  font-weight: 700;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--gh-line);
  background: var(--gh-card);
  color: var(--gh-ink-soft);
}

@keyframes gh-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
.gh-rise { animation: gh-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
