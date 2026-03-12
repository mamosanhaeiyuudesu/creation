<template>
  <div class="app-container">
    <!-- PC向けヘッダー -->
    <header class="header header--desktop">
      <nav class="nav">
        <NuxtLink 
          v-for="tool in tools" 
          :key="tool.path"
          :to="tool.path"
          :class="['nav-tab', { active: isActive(tool.path) }]"
        >
          <span class="nav-tab__icon">{{ tool.icon }}</span>
          <span class="nav-tab__text">{{ tool.name }}</span>
        </NuxtLink>
      </nav>
    </header>

    <!-- モバイル向けヘッダー -->
    <header class="header header--mobile">
      <button 
        class="menu-toggle"
        @click="isMobileMenuOpen = !isMobileMenuOpen"
        :aria-label="isMobileMenuOpen ? 'メニューを閉じる' : 'メニューを開く'"
      >
        <span class="menu-toggle__line"></span>
        <span class="menu-toggle__line"></span>
        <span class="menu-toggle__line"></span>
      </button>
      <h1 class="header__title">AI Tools</h1>
    </header>

    <!-- モバイルメニュー -->
    <nav 
      v-if="isMobileMenuOpen"
      class="mobile-menu"
      @click="isMobileMenuOpen = false"
    >
      <div class="mobile-menu__list">
        <NuxtLink 
          v-for="tool in tools" 
          :key="tool.path"
          :to="tool.path"
          class="mobile-menu__item"
        >
          <span class="mobile-menu__icon">{{ tool.icon }}</span>
          <span class="mobile-menu__text">{{ tool.name }}</span>
        </NuxtLink>
      </div>
    </nav>

    <!-- メインレイアウト -->
    <div class="layout">
      <!-- コンテンツ -->
      <main class="main">
        <NuxtPage />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const isMobileMenuOpen = ref(false)

const tools = [
  { path: '/', name: 'ホーム', icon: '🏠' },
  { path: '/snapreader', name: 'SnapReader', icon: '📸' },
  { path: '/whisper', name: 'Whisper', icon: '🎙️' },
  { path: '/tasks', name: 'Tasks', icon: '📋' },
]

const isActive = (path: string): boolean => {
  return route.path === path
}
</script>

<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: radial-gradient(circle at 20% 20%, #0f172a 0, #020617 45%);
  color: #e2e8f0;
}

#__nuxt {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
</style>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.layout {
  display: flex;
  flex: 1;
  position: relative;
}

/* PC向けサイドバー */

.main {
  flex: 1;
  overflow-y: auto;
}

/* PC向けヘッダー */
.header--desktop {
  display: none;
}

@media (min-width: 1024px) {
  .header--desktop {
    display: block;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    padding: 0 32px;
  }

  .nav {
    display: flex;
    gap: 0;
    max-width: 1200px;
    margin: 0 auto;
  }

  .nav-tab {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 20px 24px;
    text-decoration: none;
    color: #94a3b8;
    border-bottom: 2px solid transparent;
    transition: all 0.2s ease;
    font-size: 14px;
    font-weight: 500;
  }

  .nav-tab:hover {
    color: #f8fafc;
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }

  .nav-tab.active {
    color: #38bdf8;
    border-bottom-color: #38bdf8;
  }

  .nav-tab__icon {
    font-size: 18px;
  }
}

/* モバイル向けヘッダー */
.header--mobile {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: relative;
  z-index: 50;
}

@media (min-width: 1024px) {
  .header--mobile {
    display: none;
  }
}

.menu-toggle {
  display: none;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: #f8fafc;
}

@media (max-width: 1023px) {
  .menu-toggle {
    display: flex;
  }
}

.menu-toggle__line {
  display: block;
  width: 24px;
  height: 2px;
  background-color: currentColor;
  border-radius: 1px;
  transition: all 0.3s ease;
}

.header__title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  flex: 1;
  background: linear-gradient(135deg, #38bdf8, #6366f1);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.history-toggle--mobile {
  background: none;
  border: none;
  color: #f8fafc;
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.2s;
}

.history-toggle--mobile:hover {
  color: #38bdf8;
}

/* モバイルメニュー */
.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  z-index: 40;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.mobile-menu__list {
  background: #0f172a;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px 0;
  max-width: 250px;
  width: 100%;
  margin-top: 56px;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(0);
  }
}

.mobile-menu__item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  text-decoration: none;
  color: #94a3b8;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  font-size: 16px;
}

.mobile-menu__item:hover {
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.04);
  border-left-color: #38bdf8;
}

.mobile-menu__item.router-link-active {
  color: #38bdf8;
  border-left-color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}

.mobile-menu__icon {
  font-size: 20px;
  flex-shrink: 0;
}

.mobile-menu__text {
  font-weight: 500;
}

@media (max-width: 1023px) {
  .layout {
    flex-direction: column;
  }
}
</style>
