<template>
  <div class="therapist-layout">
    <header class="mm-header">
      <div class="mm-header-inner">
        <NuxtLink to="/mamorin" class="mm-logo serif">まもりん</NuxtLink>
        <nav class="mm-nav">
          <NuxtLink to="/mamorin" class="mm-nav-link">トップ</NuxtLink>
          <NuxtLink to="/mamorin/why-oyako" class="mm-nav-link">なぜ親子問題を扱うのか</NuxtLink>
          <NuxtLink to="/mamorin/qa" class="mm-nav-link">Q&amp;A</NuxtLink>
          <NuxtLink to="/mamorin#contact" class="mm-nav-link mm-nav-cta">無料相談</NuxtLink>
        </nav>
        <button class="mm-menu-btn" :class="{ open: menuOpen }" @click="menuOpen = !menuOpen" aria-label="メニュー">
          <span /><span /><span />
        </button>
      </div>
      <div class="mm-drawer" :class="{ open: menuOpen }" @click="menuOpen = false">
        <NuxtLink to="/mamorin" class="mm-drawer-link">トップ</NuxtLink>
        <NuxtLink to="/mamorin/why-oyako" class="mm-drawer-link">なぜ親子問題を扱うのか</NuxtLink>
        <NuxtLink to="/mamorin/qa" class="mm-drawer-link">Q&amp;A</NuxtLink>
        <NuxtLink to="/mamorin#contact" class="mm-drawer-link">無料相談（初回無料）</NuxtLink>
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
/* Vuetify のグローバルスタイルをリセット */
.therapist-layout,
.therapist-layout ~ * {
  all: initial;
}


.v-application:has(.therapist-layout) {
  background: transparent !important;
}

/* ── ヘッダー ── */
.mm-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(250, 249, 247, 0.88);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 0.5px solid rgba(26, 25, 22, 0.1);
  font-family: 'Noto Sans JP', sans-serif;
  box-sizing: border-box;
}

@media (prefers-color-scheme: dark) {
  .mm-header {
    background: rgba(17, 17, 16, 0.88);
    border-bottom-color: rgba(240, 237, 232, 0.1);
  }
}

.mm-header-inner {
  max-width: 720px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
}

.mm-logo {
  font-family: 'Noto Serif JP', serif !important;
  font-size: 16px;
  font-weight: 400;
  color: #1a1916;
  text-decoration: none;
  letter-spacing: 0.04em;
}

@media (prefers-color-scheme: dark) {
  .mm-logo { color: #f0ede8; }
}

.mm-nav {
  display: flex;
  align-items: center;
  gap: 1.75rem;
}

.mm-nav-link {
  font-size: 13px;
  color: #5a5854;
  text-decoration: none;
  letter-spacing: 0.03em;
  transition: color 0.15s;
  white-space: nowrap;
}

.mm-nav-link:hover,
.mm-nav-link.router-link-exact-active {
  color: #1a1916;
}

@media (prefers-color-scheme: dark) {
  .mm-nav-link { color: #a09d98; }
  .mm-nav-link:hover,
  .mm-nav-link.router-link-exact-active { color: #f0ede8; }
}

.mm-nav-cta {
  padding: 7px 18px;
  border: 0.5px solid rgba(26, 25, 22, 0.3);
  border-radius: 20px;
  font-size: 12px;
  color: #1a1916 !important;
  transition: background 0.15s;
}

.mm-nav-cta:hover {
  background: rgba(26, 25, 22, 0.06);
}

@media (prefers-color-scheme: dark) {
  .mm-nav-cta {
    border-color: rgba(240, 237, 232, 0.25);
    color: #f0ede8 !important;
  }
  .mm-nav-cta:hover { background: rgba(240, 237, 232, 0.08); }
}

/* ハンバーガー */
.mm-menu-btn {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 28px;
  height: 28px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.mm-menu-btn span {
  display: block;
  height: 1px;
  width: 100%;
  background: #1a1916;
  transition: transform 0.2s, opacity 0.2s;
  transform-origin: center;
}

@media (prefers-color-scheme: dark) {
  .mm-menu-btn span { background: #f0ede8; }
}

.mm-menu-btn.open span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.mm-menu-btn.open span:nth-child(2) { opacity: 0; }
.mm-menu-btn.open span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }

/* ドロワー */
.mm-drawer {
  display: none;
  flex-direction: column;
  background: rgba(250, 249, 247, 0.97);
  border-top: 0.5px solid rgba(26, 25, 22, 0.1);
  padding: 0;
  overflow: hidden;
  max-height: 0;
  transition: max-height 0.25s ease;
}

.mm-drawer.open {
  max-height: 300px;
}

.mm-drawer-link {
  font-family: 'Noto Sans JP', sans-serif;
  font-size: 14px;
  color: #5a5854;
  text-decoration: none;
  padding: 1rem 1.5rem;
  border-bottom: 0.5px solid rgba(26, 25, 22, 0.06);
  display: block;
}

.mm-drawer-link:last-child { border-bottom: none; }

.mm-drawer-link.router-link-exact-active { color: #1a1916; }

@media (prefers-color-scheme: dark) {
  .mm-drawer { background: rgba(17, 17, 16, 0.97); border-top-color: rgba(240, 237, 232, 0.1); }
  .mm-drawer-link { color: #a09d98; border-bottom-color: rgba(240, 237, 232, 0.06); }
  .mm-drawer-link.router-link-exact-active { color: #f0ede8; }
}

@media (max-width: 600px) {
  .mm-nav { display: none; }
  .mm-menu-btn { display: flex; }
  .mm-drawer { display: flex; }
}
</style>
