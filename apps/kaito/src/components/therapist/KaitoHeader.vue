<template>
  <header class="site-header">
    <div class="nav-container">
      <NuxtLink class="logo" to="">月ノ瀬 直</NuxtLink>
      <input type="checkbox" id="nav-toggle" class="nav-toggle" aria-label="メニューを開く" />
      <label for="nav-toggle" class="nav-toggle-label" aria-hidden="true">
        <span></span>
        <span></span>
        <span></span>
      </label>
      <nav class="global-nav" aria-label="主要ナビゲーション">
        <NuxtLink to="" :class="{ 'is-active': route.path === '' }">ホーム</NuxtLink>
        <NuxtLink to="/profile" :class="{ 'is-active': route.path === '/kaito/profile' }">月ノ瀬 直について</NuxtLink>
        <NuxtLink to="/services" :class="{ 'is-active': route.path === '/kaito/services' }">サービス内容</NuxtLink>
        <NuxtLink to="/for-you" :class="{ 'is-active': route.path === '/kaito/for-you' }">こんな方へ</NuxtLink>
        <NuxtLink to="/testimonials" :class="{ 'is-active': route.path === '/kaito/testimonials' }">お客様の声</NuxtLink>
        <NuxtLink to="/faq" :class="{ 'is-active': route.path === '/kaito/faq' }">よくある質問</NuxtLink>
      </nav>
      <a class="cta-link" href="mailto:hello@example.com">お問い合わせ</a>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute()
</script>
