<template>
  <div class="kaki-root min-h-screen w-full">
    <!-- 生成りの紙のような下地に、やわらかな光と葉のテクスチャを重ねる -->
    <div class="kaki-bg" aria-hidden="true">
      <div class="kaki-bg__glow" />
      <div class="kaki-bg__grain" />
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
.kaki-root {
  /* 柿のパレット（彩度を抑えた橙を基調にした絵本トーン） */
  --kaki-paper: #fbf4e6;
  --kaki-paper-2: #f4e9d3;
  --kaki-card: #fffdf8;
  --kaki-ink: #4a3a2a;
  --kaki-ink-soft: #8a7458;
  --kaki-line: #e7d9be;

  --kaki-persimmon: #e07a35;
  --kaki-persimmon-deep: #c85e22;
  --kaki-persimmon-soft: #f6a15a;

  --kaki-leaf: #7a934f;
  --kaki-leaf-soft: #a7bd7e;
  --kaki-amber: #d9a03c;
  --kaki-clay: #c58267; /* 療養中。赤は使わない */
  --kaki-sky: #8fb0b8;

  position: relative;
  color: var(--kaki-ink);
  background: var(--kaki-paper);
  font-family: 'Zen Maru Gothic', 'Hiragino Maru Gothic ProN', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.kaki-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 90% at 15% -10%, #fff7ea 0%, transparent 55%),
    radial-gradient(120% 100% at 100% 0%, #fbe6c8 0%, transparent 50%),
    linear-gradient(180deg, var(--kaki-paper) 0%, var(--kaki-paper-2) 100%);
}

.kaki-bg__glow {
  position: absolute;
  inset: 0;
  background: radial-gradient(60% 40% at 50% 8%, rgba(224, 122, 53, 0.10) 0%, transparent 70%);
}

/* 紙の粒子感（軽い斑点テクスチャ） */
.kaki-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.5;
  background-image: radial-gradient(rgba(120, 90, 50, 0.06) 1px, transparent 1.4px);
  background-size: 4px 4px;
}

/* 見出し用のディスプレイフォント */
.kaki-display {
  font-family: 'Kiwi Maru', 'Zen Maru Gothic', serif;
}

/* 手描き風の下線 */
.kaki-underline {
  background-image: linear-gradient(transparent 60%, rgba(224, 122, 53, 0.28) 60%);
}

@keyframes kaki-rise {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
.kaki-rise { animation: kaki-rise 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
