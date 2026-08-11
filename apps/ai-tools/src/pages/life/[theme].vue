<template>
  <div class="min-h-[100dvh] flex flex-col items-center px-4 py-6">
    <div class="w-full max-w-[640px] flex-1 flex flex-col lf-rise">
      <header class="flex items-center gap-3 mb-4">
        <NuxtLink to="/life" class="lf-btn-ghost !h-9 !px-3">← 一覧</NuxtLink>
        <div class="min-w-0">
          <p class="lf-display text-lg font-semibold leading-none">
            <span class="mr-1">{{ theme?.emoji }}</span>{{ theme?.label }}
          </p>
          <p class="text-[11px] text-[var(--lf-ink-faint)] mt-1">{{ theme?.ageHint }}</p>
        </div>
      </header>

      <div v-if="notReady" class="lf-card px-5 py-6 text-center text-sm text-[var(--lf-ink-soft)]">
        <template v-if="!checked">読み込んでいます…</template>
        <template v-else-if="!isLoggedIn">ログインすると利用できます。</template>
        <template v-else-if="!theme">このテーマは見つかりませんでした。</template>
        <template v-else-if="!googleConnected">
          先にGoogleと連携してください。
          <NuxtLink to="/life" class="text-[var(--lf-accent)] underline">連携画面へ戻る</NuxtLink>
        </template>
      </div>
      <ThemeChat v-else-if="theme" :theme="theme" class="flex-1" />
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import ThemeChat from '~/components/life/ThemeChat.client.vue'
import { findLifeTheme } from '~/utils/life-themes'

definePageMeta({ layout: 'life' })

const route = useRoute()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const theme = computed(() => findLifeTheme(String(route.params.theme ?? '')))
const googleConnected = ref(false)

const notReady = computed(() => !checked.value || !isLoggedIn.value || !theme.value || !googleConnected.value)

useHead({ title: computed(() => `life — ${theme.value?.label ?? ''}`) })

onMounted(async () => {
  await checkAuth()
  if (!isLoggedIn.value) return
  try {
    const status = await $fetch<{ connected: boolean }>('/api/life/google/status')
    googleConnected.value = status.connected
  } catch { /* 未接続のまま */ }
})
</script>
