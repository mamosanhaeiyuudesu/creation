<template>
  <div class="therapist-layout">
    <header class="mm-header">
      <div class="mm-header-inner">
        <nav class="mm-nav">
          <NuxtLink to="/" class="mm-nav-link"><span class="mm-yinyang">☯</span> ホーム</NuxtLink>
          <!-- <NuxtLink to="/why-oyako" class="mm-nav-link">なぜ親子問題を扱うのか</NuxtLink> -->
          <NuxtLink to="/voice" class="mm-nav-link">お客様の声</NuxtLink>
          <NuxtLink to="/story" class="mm-nav-link">私の原体験</NuxtLink>
          <NuxtLink to="/qa" class="mm-nav-link">Q&amp;A</NuxtLink>
          <a href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer" class="mm-nav-link mm-nav-cta">無料相談</a>
        </nav>
        <button class="mm-menu-btn" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" aria-label="メニュー">
          <span /><span /><span />
        </button>
      </div>
      <div class="mm-drawer" :class="{ open: menuOpen }" @click="menuOpen = false">
        <NuxtLink to="/" class="mm-drawer-link">ホーム</NuxtLink>
        <!-- <NuxtLink to="/why-oyako" class="mm-drawer-link">なぜ親子問題を扱うのか</NuxtLink> -->
        <NuxtLink to="/voice" class="mm-drawer-link">お客様の声</NuxtLink>
        <NuxtLink to="/story" class="mm-drawer-link">私の原体験</NuxtLink>
        <NuxtLink to="/qa" class="mm-drawer-link">Q&amp;A</NuxtLink>
        <a href="https://docs.google.com/forms/d/e/1FAIpQLSckcLkBNH9xEMSeS3_SuDznoShew41SF6Ja6Du7XHvS6-rwRg/viewform?usp=publish-editor" target="_blank" rel="noopener noreferrer" class="mm-drawer-link">無料相談（初回無料）</a>
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

.v-application:has(.therapist-layout) {
  background: transparent !important;
}

.mm-yinyang {
  font-size: 18px;
  line-height: 1;
  vertical-align: middle;
}
</style>
