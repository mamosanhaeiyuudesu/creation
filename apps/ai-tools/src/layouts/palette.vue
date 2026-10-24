<template>
  <div class="pl-root min-h-screen w-full">
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
      href: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap',
    },
  ],
})
</script>

<style>
.pl-root {
  /* 画材店の紙とインク。絵の具の4色（朱・青緑・山吹・藤）を差し色にする */
  --pl-paper: #f6f2ea;
  --pl-paper-2: #ece6d9;
  --pl-card: #fffdf8;
  --pl-ink: #2a2723;
  --pl-ink-soft: #7d766a;
  --pl-line: #e2dbcb;
  --pl-vermilion: #e0522b;
  --pl-vermilion-deep: #bd3d1a;
  --pl-teal: #1f8a8a;
  --pl-mustard: #e8b630;
  --pl-wisteria: #8a74c7;

  position: relative;
  color: var(--pl-ink);
  background:
    radial-gradient(90% 60% at 0% 0%, rgba(232, 182, 48, 0.12) 0%, transparent 60%),
    radial-gradient(80% 60% at 100% 0%, rgba(31, 138, 138, 0.10) 0%, transparent 60%),
    var(--pl-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Kaku Gothic ProN', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.pl-display { font-family: 'DM Serif Display', 'Zen Kaku Gothic New', serif; letter-spacing: 0.01em; }

.pl-card {
  background: var(--pl-card);
  border: 1px solid var(--pl-line);
  border-radius: 16px;
  padding: 1rem;
}
.pl-label { display: block; font-size: 12.5px; font-weight: 700; color: var(--pl-ink); }
.pl-input {
  background: #fff;
  border: 1px solid var(--pl-line);
  border-radius: 10px;
  padding: 0.5rem 0.7rem;
  font-size: 14px;
  color: var(--pl-ink);
  width: 100%;
  font-family: inherit;
}
.pl-input::placeholder { color: color-mix(in srgb, var(--pl-ink-soft) 65%, transparent); }
.pl-input:focus { outline: none; border-color: var(--pl-teal); box-shadow: 0 0 0 3px rgba(31, 138, 138, 0.15); }
textarea.pl-input { resize: vertical; line-height: 1.55; }

.pl-btn {
  height: 2.6rem;
  padding: 0 1.3rem;
  border-radius: 999px;
  font-weight: 900;
  font-size: 14.5px;
  color: #fff;
  background: var(--pl-vermilion);
  transition: background 0.15s, opacity 0.15s, transform 0.1s;
}
.pl-btn:hover:not(:disabled) { background: var(--pl-vermilion-deep); }
.pl-btn:active:not(:disabled) { transform: translateY(1px); }
.pl-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.pl-btn-ghost {
  height: 2.2rem;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 12.5px;
  color: var(--pl-ink-soft);
  border: 1px solid var(--pl-line);
  background: var(--pl-card);
  transition: border-color 0.15s, color 0.15s;
}
.pl-btn-ghost:hover:not(:disabled) { border-color: var(--pl-teal); color: var(--pl-teal); }
.pl-btn-ghost:disabled { opacity: 0.45; cursor: not-allowed; }

.pl-tab {
  padding: 0.55rem 1.2rem;
  font-weight: 900;
  font-size: 14px;
  border-radius: 999px;
  color: var(--pl-ink-soft);
  transition: all 0.15s;
}
.pl-tab--on { background: var(--pl-ink); color: #fff; }

.pl-chip {
  font-size: 12px;
  font-weight: 700;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--pl-line);
  background: var(--pl-card);
  color: var(--pl-ink-soft);
}

@keyframes pl-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.pl-rise { animation: pl-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }

@keyframes pl-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
}
.pl-pulse { animation: pl-pulse 1.4s ease-in-out infinite; }
</style>
