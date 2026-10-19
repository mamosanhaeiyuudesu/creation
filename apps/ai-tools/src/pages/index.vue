<template>
  <div class="tl-root">
    <div class="tl-wrap">
      <header class="tl-head">
        <h1 class="tl-h1">ツールたち</h1>
        <p class="tl-lead">これまでに作ったツールの一覧です。全 {{ toolCount }} 種。</p>
      </header>

      <section v-for="section in sections" :key="section.title" class="tl-section">
        <div class="tl-section-head">
          <h2 :class="['tl-h2', section.accent === 'slate' && 'tl-h2--off']">{{ section.title }}</h2>
          <p class="tl-note">{{ section.lead }}</p>
        </div>

        <div class="tl-grid">
          <NuxtLink
            v-for="tool in section.tools"
            :key="tool.path"
            :to="tool.path"
            :class="['tl-card', section.accent === 'slate' && 'tl-card--off']"
          >
            <div class="tl-icon">{{ tool.icon }}</div>
            <div class="tl-body">
              <h3 class="tl-name">{{ tool.name }}</h3>
              <p class="tl-desc">{{ tool.desc }}</p>
              <div v-if="tool.tags?.length" class="tl-tags">
                <span v-for="tag in tool.tags" :key="tag" class="tl-tag">{{ tag }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <footer class="tl-foot">
        <NuxtLink to="/privacy">プライバシーポリシー</NuxtLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { SECTIONS } from '~/utils/tools'

const sections = SECTIONS

const toolCount = computed(() => sections.reduce((sum, s) => sum + s.tools.length, 0))

useHead({
  title: 'ツールたち',
  meta: [{ name: 'description', content: 'これまでに作ったツールの一覧' }],
  link: [
    { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap' },
  ],
})
</script>

<style scoped>
/* 見た目は apps/production/kikigaki の kikigaki.css に合わせた（青を基調・白い面・細い罫線） */
.tl-root {
  --tl-bg: #f1f6fc;
  --tl-panel: #ffffff;
  --tl-line: #dbe4ef;
  --tl-line-strong: #b9c8da;
  --tl-ink: #1f2a37;
  --tl-ink-soft: #4b5868;
  --tl-ink-faint: #8593a3;
  --tl-accent: #1d6fd6;
  --tl-accent-strong: #134c9c;
  --tl-accent-soft: #e6f0fb;
  min-height: 100%;
  padding: 2rem 16px 3rem;
  background: var(--tl-bg);
  color: var(--tl-ink);
  font-family: 'Noto Sans JP', 'Hiragino Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.7;
}
.tl-wrap { max-width: 1100px; margin: 0 auto; }
.tl-head { margin-bottom: 2rem; }
.tl-h1 { margin: 0; font-size: 22px; font-weight: 700; line-height: 1.4; letter-spacing: 0.02em; }
.tl-lead { margin: 0.25rem 0 0; color: var(--tl-ink-soft); }
.tl-section { margin-bottom: 2.25rem; }
.tl-section-head {
  display: flex; align-items: baseline; gap: 0.75rem;
  margin-bottom: 0.9rem; padding-bottom: 0.6rem; border-bottom: 1px solid var(--tl-line);
}
.tl-h2 { margin: 0; font-size: 15px; font-weight: 700; color: var(--tl-accent-strong); }
.tl-h2--off { color: var(--tl-ink-faint); }
.tl-note { margin: 0; font-size: 12px; color: var(--tl-ink-faint); }
.tl-grid { display: grid; grid-template-columns: 1fr; gap: 0.75rem; }
@media (min-width: 640px) { .tl-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1100px) { .tl-grid { grid-template-columns: repeat(3, 1fr); } }
.tl-card {
  display: flex; gap: 0.9rem; padding: 0.9rem 1rem;
  background: var(--tl-panel); border: 1px solid var(--tl-line); border-radius: 10px;
  box-shadow: 0 2px 10px rgba(20, 60, 120, 0.06);
  color: inherit; text-decoration: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.tl-card:hover { border-color: var(--tl-accent); box-shadow: 0 4px 14px rgba(29, 111, 214, 0.14); }
.tl-card--off { background: #f7f9fc; box-shadow: none; opacity: 0.8; }
.tl-card--off:hover { opacity: 1; border-color: var(--tl-line-strong); box-shadow: none; }
.tl-icon { flex-shrink: 0; font-size: 28px; line-height: 1.2; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; }
.tl-body { min-width: 0; }
.tl-name { margin: 0; font-size: 15px; font-weight: 700; }
.tl-card:hover .tl-name { color: var(--tl-accent); }
.tl-desc { margin: 0.2rem 0 0; font-size: 13px; color: var(--tl-ink-soft); line-height: 1.7; }
.tl-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
.tl-tag {
  font-size: 11px; padding: 0 0.5rem; border-radius: 999px;
  color: var(--tl-accent-strong); background: var(--tl-accent-soft); border: 1px solid #c5dbf5;
}
.tl-card--off .tl-tag { color: var(--tl-ink-faint); background: #fff; border-color: var(--tl-line); }
.tl-foot { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid var(--tl-line); font-size: 12px; }
.tl-foot a { color: var(--tl-ink-faint); }
.tl-foot a:hover { color: var(--tl-ink-soft); }
</style>
