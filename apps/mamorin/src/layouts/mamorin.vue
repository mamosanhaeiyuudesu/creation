<template>
  <div class="therapist-layout">
    <header class="mm-header">
      <div class="mm-header-inner">
        <!-- <NuxtLink to="/" class="mm-logo">
          <span class="mm-yinyang">☯</span> まもりん
        </NuxtLink> -->
        <nav class="mm-nav">
          <a href="#voice" class="mm-nav-link">お客様の声</a>
          <a href="#profile" class="mm-nav-link">私について</a>
          <a href="#pricing" class="mm-nav-link">料金体系</a>
          <a href="#qa" class="mm-nav-link">Q&amp;A</a>
          <a href="https://note.com/parent_child" target="_blank" rel="noopener noreferrer" class="mm-nav-link">ブログ</a>
          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor"
            target="_blank"
            rel="noopener noreferrer"
            class="mm-nav-link mm-nav-cta"
          >無料相談</a>
        </nav>
        <button
          class="mm-menu-btn"
          :class="{ open: menuOpen }"
          @click="menuOpen = !menuOpen"
          aria-label="メニュー"
        >
          <span /><span /><span />
        </button>
      </div>
      <div class="mm-drawer" :class="{ open: menuOpen }" @click="menuOpen = false">
        <a href="#voice" class="mm-drawer-link">お客様の声</a>
        <a href="#profile" class="mm-drawer-link">私について</a>
        <a href="#pricing" class="mm-drawer-link">料金体系</a>
        <a href="#qa" class="mm-drawer-link">Q&amp;A</a>
        <a href="https://note.com/parent_child" target="_blank" rel="noopener noreferrer" class="mm-drawer-link">ブログ</a>
        <a
          href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor"
          target="_blank"
          rel="noopener noreferrer"
          class="mm-drawer-link"
        >無料相談（初回無料）</a>
      </div>
    </header>
    <slot />
  </div>
</template>

<script setup lang="ts">
const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<style>
@import '~/assets/css/mamorin.css';

.therapist-layout,
.therapist-layout ~ * {
  all: initial;
}

.therapist-layout {
  --c-bg: #f0f6f4;
  --c-bg-surface: #e4efec;
  --c-bg-card: #ffffff;
  --c-border: rgba(0, 118, 134, 0.13);
  --c-border-strong: rgba(0, 118, 134, 0.30);
  --c-primary: #007686;
  --c-primary-dark: #005b69;
  --c-accent: #b56740;
  --c-accent-light: #cc8057;
  --c-text: #0c2a30;
  --c-text-muted: #2e5c67;
  --c-text-dim: #698fa0;
  --content-max: 760px;
  --radius: 10px;
  --radius-lg: 16px;
  --f-mono: 'IBM Plex Mono', 'Courier New', monospace;
  --f-sans: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
  --f-serif: 'Zen Maru Gothic', sans-serif;
}

.v-application:has(.therapist-layout) {
  background: transparent !important;
}

.mm-yinyang {
  font-size: 18px;
  line-height: 1;
  vertical-align: middle;
}
</style>
