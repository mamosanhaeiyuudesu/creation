<template>
  <div class="fm-root min-h-screen w-full">
    <div class="fm-bg" aria-hidden="true">
      <div class="fm-bg__grain" />
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
      href: 'https://fonts.googleapis.com/css2?family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap',
    },
  ],
})
</script>

<style>
.fm-root {
  /* 土と葉のパレット。
     ⚠ 変動費（畑の中）＝緑系 / 固定費（畑の外）＝グレー系 は仕様§6-2 の要件。
     「トイレの男女マークのように色で瞬時に判断できる」ことが最優先なので、この2色は他の用途に流用しない。 */
  --fm-paper: #f6f5ef;
  --fm-paper-2: #eeece2;
  --fm-card: #fffefa;
  --fm-ink: #2e3a2c;
  --fm-ink-soft: #79806f;
  --fm-line: #e2e0d3;

  /* 畑の中（変動費）＝緑 */
  --fm-in: #4e9a5a;
  --fm-in-deep: #2f7239;
  --fm-in-soft: #cfe6d2;
  /* 畑の外（固定費）＝グレー */
  --fm-out: #8b8f96;
  --fm-out-deep: #5f646c;
  --fm-out-soft: #dcdee1;
  /* 売上＝実りの色 */
  --fm-rev: #d9a13c;
  --fm-rev-deep: #b3801f;
  --fm-rev-soft: #f4e3c1;

  --fm-plus: #2f7239;   /* 黒字 */
  --fm-minus: #c0392b;  /* 赤字 */
  --fm-warn: #d98e18;   /* 要確認・仮置き */

  position: relative;
  color: var(--fm-ink);
  background: var(--fm-paper);
  font-family: 'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif;
  /* 現場で片手で見る前提なので、既定の文字を大きめに置く */
  font-size: 15px;
  -webkit-font-smoothing: antialiased;
}

.fm-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 10% -10%, #ffffff 0%, transparent 55%),
    radial-gradient(110% 90% at 100% 0%, #e8efe2 0%, transparent 50%),
    linear-gradient(180deg, var(--fm-paper) 0%, var(--fm-paper-2) 100%);
}
.fm-bg__grain {
  position: absolute;
  inset: 0;
  opacity: 0.45;
  background-image: radial-gradient(rgba(90, 100, 70, 0.06) 1px, transparent 1.4px);
  background-size: 4px 4px;
}

.fm-card {
  background: var(--fm-card);
  border: 1px solid var(--fm-line);
  border-radius: 16px;
}

/* 数字は等幅で。桁が揃わないと「読む」作業になってしまう */
.fm-num {
  font-variant-numeric: tabular-nums;
  font-feature-settings: 'tnum';
}

.fm-input {
  background: var(--fm-card);
  border: 1px solid var(--fm-line);
  border-radius: 12px;
  padding: 0.55rem 0.8rem;
  font-size: 15px;
  color: var(--fm-ink);
  width: 100%;
}
.fm-input::placeholder { color: color-mix(in srgb, var(--fm-ink-soft) 60%, transparent); }
.fm-input:focus { outline: none; border-color: var(--fm-in); }
.fm-input--warn { border-color: var(--fm-warn); background: #fffbef; }

.fm-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--fm-ink-soft);
  margin-bottom: 0.3rem;
}

.fm-btn {
  height: 2.75rem;
  padding: 0 1.2rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 15px;
  color: #fff;
  background: var(--fm-in);
  transition: background 0.15s, opacity 0.15s;
}
.fm-btn:hover { background: var(--fm-in-deep); }
.fm-btn:disabled { opacity: 0.4; }

.fm-btn-ghost {
  height: 2.75rem;
  padding: 0 1rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 14px;
  color: var(--fm-ink-soft);
  border: 1px solid var(--fm-line);
  background: var(--fm-card);
}
.fm-btn-ghost:hover { border-color: var(--fm-in-soft); color: var(--fm-ink); }

.fm-chip {
  font-size: 13px;
  font-weight: 700;
  padding: 0.42rem 0.85rem;
  border-radius: 999px;
  border: 1px solid var(--fm-line);
  background: var(--fm-card);
  color: var(--fm-ink-soft);
  transition: all 0.15s;
}
.fm-chip--on {
  background: var(--fm-in);
  border-color: var(--fm-in);
  color: #fff;
}

.fm-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 11.5px;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  line-height: 1.5;
}
.fm-tag--in { background: var(--fm-in-soft); color: var(--fm-in-deep); }
.fm-tag--out { background: var(--fm-out-soft); color: var(--fm-out-deep); }
.fm-tag--rev { background: var(--fm-rev-soft); color: var(--fm-rev-deep); }
.fm-tag--warn { background: #fdf0d5; color: #96620b; }

@keyframes fm-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.fm-rise { animation: fm-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
</style>
