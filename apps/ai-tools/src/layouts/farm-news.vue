<template>
  <div class="fnews-root min-h-screen w-full">
    <slot />
  </div>
</template>

<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@500;700&display=swap' },
  ],
})
</script>

<style>
.fnews-root {
  --fnews-paper: #f6f7f2;
  --fnews-card: #ffffff;
  --fnews-ink: #1f241d;
  --fnews-ink-soft: #5c6455;
  --fnews-ink-faint: #93998a;
  --fnews-line: #dfe3d6;
  --fnews-accent: #3f6b3a;
  --fnews-accent-soft: #e3ecdd;

  color: var(--fnews-ink);
  background: var(--fnews-paper);
  font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.fnews-display {
  font-family: 'Noto Serif JP', 'Hiragino Mincho ProN', serif;
  font-weight: 700;
}

.fnews-btn-ghost {
  height: 2.2rem;
  padding: 0 0.9rem;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 700;
  color: var(--fnews-ink-soft);
  border: 1px solid var(--fnews-line);
  background: var(--fnews-card);
  transition: border-color 0.15s, color 0.15s;
}
.fnews-btn-ghost:hover { border-color: var(--fnews-accent); color: var(--fnews-accent); }

.fnews-chip {
  height: 1.75rem;
  padding: 0 0.7rem;
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--fnews-ink-soft);
  border: 1px solid var(--fnews-line);
  background: var(--fnews-card);
  white-space: nowrap;
}
.fnews-chip--on {
  color: var(--fnews-accent);
  border-color: var(--fnews-accent);
  background: var(--fnews-accent-soft);
}

.fnews-card {
  background: var(--fnews-card);
  border: 1px solid var(--fnews-line);
  border-radius: 6px;
  padding: 1rem 1.1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.fnews-card:hover { box-shadow: 0 2px 10px rgba(31, 36, 29, 0.06); }
.fnews-card--top { border-left: 3px solid var(--fnews-accent); }

.fnews-summary {
  cursor: pointer;
  list-style: none;
  position: relative;
  padding-right: 1.4rem;
}
.fnews-summary::-webkit-details-marker { display: none; }
.fnews-summary::after {
  content: '▾';
  position: absolute;
  top: 0;
  right: 0;
  color: var(--fnews-ink-faint);
  transition: transform 0.15s, color 0.15s;
}
.fnews-details[open] > .fnews-summary::after { transform: rotate(180deg); }
.fnews-summary:hover::after { color: var(--fnews-accent); }

.fnews-current-card {
  background: var(--fnews-card);
  border: 1px solid var(--fnews-line);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.fnews-current-card:hover { box-shadow: 0 2px 10px rgba(31, 36, 29, 0.06); border-color: var(--fnews-accent); }
.fnews-current-card--on {
  border-color: var(--fnews-accent);
  background: var(--fnews-accent-soft);
}

.fnews-archive-card {
  background: var(--fnews-card);
  border: 1px solid var(--fnews-line);
  border-radius: 8px;
  padding: 0.85rem 1rem;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.fnews-archive-card:hover { box-shadow: 0 2px 10px rgba(31, 36, 29, 0.06); border-color: var(--fnews-accent); }

.fnews-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(31, 36, 29, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}
.fnews-modal {
  background: var(--fnews-card);
  border-radius: 10px;
  padding: 1.5rem;
  max-width: 480px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(31, 36, 29, 0.25);
}
.fnews-modal-close {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  font-size: 18px;
  line-height: 1;
  color: var(--fnews-ink-faint);
  transition: background 0.15s, color 0.15s;
}
.fnews-modal-close:hover { background: rgba(31, 36, 29, 0.06); color: var(--fnews-ink); }

.fnews-input {
  height: 1.9rem;
  background: var(--fnews-card);
  border: 1px solid var(--fnews-line);
  border-radius: 4px;
  padding: 0 0.6rem;
  font-size: 13px;
  color: var(--fnews-ink);
}
.fnews-input:focus { outline: none; border-color: var(--fnews-accent); }
</style>
