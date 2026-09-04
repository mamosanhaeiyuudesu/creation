<template>
  <div class="news-root min-h-screen w-full">
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    // 見出しは明朝。朝刊を読む感じに寄せる。
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;700&display=swap' },
  ],
})
</script>

<style>
.news-root {
  --news-paper: #f7f5f2;
  --news-card: #ffffff;
  --news-ink: #1d1f22;
  --news-ink-soft: #6f6a64;
  --news-ink-faint: #a19b93;
  --news-line: #e6e1da;
  --news-accent: #b4412f;
  --news-accent-soft: #f3e0da;

  color: var(--news-ink);
  background: var(--news-paper);
  font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.news-display {
  font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
  font-weight: 700;
}

.news-btn {
  height: 2.2rem;
  padding: 0 0.95rem;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  color: #fff;
  background: var(--news-ink);
  transition: opacity 0.15s;
}
.news-btn:hover { opacity: 0.85; }
.news-btn:disabled { opacity: 0.35; }

.news-btn-ghost {
  height: 2.2rem;
  padding: 0 0.9rem;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--news-ink-soft);
  border: 1px solid var(--news-line);
  background: var(--news-card);
  transition: border-color 0.15s, color 0.15s;
}
.news-btn-ghost:hover { border-color: var(--news-accent); color: var(--news-accent); }
.news-btn-ghost:disabled { opacity: 0.4; }
.news-btn-ghost:disabled:hover { border-color: var(--news-line); color: var(--news-ink-soft); }

.news-chip {
  height: 1.75rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--news-ink-soft);
  border: 1px solid var(--news-line);
  background: var(--news-card);
  white-space: nowrap;
}
.news-chip--on {
  color: var(--news-accent);
  border-color: var(--news-accent);
  background: var(--news-accent-soft);
}

.news-card {
  background: var(--news-card);
  border: 1px solid var(--news-line);
  border-radius: 6px;
  padding: 1rem 1.1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.news-card:hover { box-shadow: 0 2px 10px rgba(29, 31, 34, 0.06); }
.news-card--top { border-left: 3px solid var(--news-accent); }

.news-input {
  height: 1.9rem;
  background: var(--news-card);
  border: 1px solid var(--news-line);
  border-radius: 4px;
  padding: 0 0.6rem;
  font-size: 13px;
  color: var(--news-ink);
}
.news-input:focus { outline: none; border-color: var(--news-accent); }
</style>
