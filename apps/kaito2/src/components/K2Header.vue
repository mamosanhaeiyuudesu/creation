<template>
  <header class="k2-header">
    <div class="k2-header-inner">
      <a class="k2-logo" href="#top" @click="navOpen = false">月ノ瀬 直</a>
      <button
        type="button"
        class="k2-nav-toggle"
        :class="{ 'is-open': navOpen }"
        :aria-expanded="navOpen"
        aria-controls="k2-nav"
        aria-label="メニューを開く"
        @click="navOpen = !navOpen"
      >
        <span></span><span></span><span></span>
      </button>
      <nav id="k2-nav" class="k2-nav" :class="{ 'is-open': navOpen }" aria-label="主要ナビゲーション">
        <a v-for="item in navItems" :key="item.id" :href="`#${item.id}`" @click="navOpen = false">{{ item.label }}</a>
        <a v-if="site.noteUrl" :href="site.noteUrl" target="_blank" rel="noopener noreferrer" @click="navOpen = false">note</a>
        <a
          class="k2-btn k2-btn-accent k2-nav-cta"
          :href="site.applyFormUrl || '#contact'"
          :target="site.applyFormUrl ? '_blank' : undefined"
          :rel="site.applyFormUrl ? 'noopener noreferrer' : undefined"
          @click="navOpen = false"
        >お申し込み</a>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { site } from '~/config/site'

const navItems = [
  { id: 'menu', label: 'メニュー・料金' },
  { id: 'for-you', label: 'こんな方へ' },
  { id: 'voices', label: 'お客様の声' },
  { id: 'about', label: 'プロフィール' },
  { id: 'faq', label: 'よくある質問' },
]

const navOpen = ref(false)
</script>
