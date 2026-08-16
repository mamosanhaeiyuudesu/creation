<template>
  <header class="site-header">
    <div class="nav-container">
      <a class="logo" href="#top" @click="closeNav">月ノ瀬 直</a>
      <button
        type="button"
        class="nav-toggle-label"
        :class="{ 'is-open': navOpen }"
        :aria-expanded="navOpen"
        aria-controls="global-nav"
        aria-label="メニューを開く"
        @click="navOpen = !navOpen"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>
      <nav id="global-nav" class="global-nav" :class="{ 'is-open': navOpen }" aria-label="主要ナビゲーション">
        <a
          v-for="item in navItems"
          :key="item.id"
          :href="`#${item.id}`"
          :class="{ 'is-active': activeId === item.id }"
          @click="closeNav"
        >{{ item.label }}</a>
      </nav>
      <a class="cta-link" href="#contact" @click="closeNav">お問い合わせ</a>
    </div>
  </header>
</template>

<script setup lang="ts">
const navItems = [
  { id: 'for-you', label: 'こんな方へ' },
  { id: 'style', label: 'セッションのスタイル' },
  { id: 'services', label: 'セッションの内容' },
  { id: 'about', label: '月ノ瀬 直について' },
  { id: 'testimonials', label: 'お客様の声' },
  { id: 'faq', label: 'よくある質問' },
]

const navOpen = ref(false)
const activeId = ref('')

function closeNav() {
  navOpen.value = false
}

// スクロール位置に応じてナビの現在地をハイライトする
let observer: IntersectionObserver | null = null

onMounted(() => {
  const sections = navItems
    .map((item) => document.getElementById(item.id))
    .filter((el): el is HTMLElement => el !== null)

  if (!sections.length) return

  observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

      if (visible.length) activeId.value = visible[0].target.id
    },
    // 追従ヘッダーの下側だけを判定領域にする
    { rootMargin: '-80px 0px -55% 0px', threshold: 0 },
  )

  sections.forEach((el) => observer?.observe(el))
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})
</script>
