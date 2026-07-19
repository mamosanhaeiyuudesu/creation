<template>
  <div class="max-w-[980px] mx-auto px-4 sm:px-6 pt-6 pb-16">
    <!-- ブランドヘッダー -->
    <header class="flex items-center justify-between mb-7">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🍂</span>
        <div>
          <h1 class="kaki-display text-[22px] sm:text-[26px] font-bold leading-none">柿の木のいえ</h1>
          <p class="text-[12px] text-[var(--kaki-ink-soft)] mt-1">あなたが見守る木</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <NuxtLink v-if="me?.role === 'admin'" to="/kaki/admin" class="text-[13px] font-bold text-[var(--kaki-persimmon-deep)] px-3 py-1.5 rounded-full border border-[var(--kaki-line)] bg-[var(--kaki-card)]">農家の管理画面 →</NuxtLink>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--kaki-ink-soft)] px-3 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </header>

    <!-- ローディング -->
    <div v-if="loading" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="i in 3" :key="i" class="rounded-[26px] aspect-[3/4] bg-[var(--kaki-paper-2)]/70 animate-pulse" />
    </div>

    <!-- 木一覧 -->
    <div v-else-if="trees.length" class="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <TreeCard v-for="(t, i) in trees" :key="t.id" :tree="t" :to="`/kaki/${t.id}`" class="kaki-rise" :style="{ animationDelay: `${i * 60}ms` }" />
    </div>

    <!-- 木がない -->
    <div v-else-if="!loading" class="text-center py-20 kaki-rise">
      <span class="text-5xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🌱</span>
      <p class="mt-3 text-[var(--kaki-ink)] font-bold">まだあなたの木が登録されていません</p>
      <p class="mt-1 text-[13px] text-[var(--kaki-ink-soft)]">農家さんが木を割り当てると、ここに現れます。</p>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import TreeCard from '~/components/kaki/TreeCard.vue'
import type { KakiMe, TreeSummary } from '~/types/kaki'

definePageMeta({ layout: 'kaki' })
useHead({
  title: '柿の木のいえ',
  link: [{ rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🍂</text></svg>` }],
})

const isDev = import.meta.dev
const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => !isDev && checked.value && !isLoggedIn.value)

const me = ref<KakiMe | null>(null)
const trees = ref<TreeSummary[]>([])
const loading = ref(true)

const router = useRouter()

async function load() {
  loading.value = true
  try {
    me.value = await $fetch<KakiMe>('/api/kaki/me')
    if (me.value?.role === 'admin') {
      await router.replace('/kaki/admin')
      return
    }
    trees.value = await $fetch<TreeSummary[]>('/api/kaki/trees')
  } catch {
    trees.value = []
  } finally {
    loading.value = false
  }
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value || isDev) await load()
  else loading.value = false
})
</script>
