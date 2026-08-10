<template>
  <div class="min-h-[100dvh] flex flex-col items-center px-4 py-10">
    <div class="w-full max-w-[720px] lf-rise">
      <header class="text-center mb-8">
        <p class="text-3xl mb-2">📖</p>
        <h1 class="lf-display text-2xl sm:text-3xl font-semibold">life</h1>
        <p class="text-sm text-[var(--lf-ink-soft)] mt-2 leading-relaxed">
          あなたの人生を、少しずつ聞かせてください。<br class="hidden sm:block">
          答えた内容は、あなた自身のGoogleスプレッドシートに保存されます。
        </p>
      </header>

      <div v-if="errorMessage" class="lf-card px-4 py-3 mb-5 border-red-300 bg-red-50 text-red-700 text-sm">
        {{ errorMessage }}
      </div>

      <!-- Google連携 -->
      <section class="lf-card px-5 py-4 mb-6 flex flex-wrap items-center gap-4">
        <span class="text-2xl">🔗</span>
        <div class="flex-1 min-w-[180px]">
          <p class="text-sm font-semibold">Googleスプレッドシートに保存</p>
          <p class="text-xs text-[var(--lf-ink-faint)] mt-0.5 leading-relaxed">
            <template v-if="googleConnected">
              連携済みです。回答はあなたのGoogleドライブに保存されます。運営者はその内容を保存しません。
            </template>
            <template v-else>
              Googleアカウントと連携すると、専用のスプレッドシートが作成され、そこに回答が保存されます（運営者は内容を保存しません）。
            </template>
          </p>
        </div>
        <a v-if="googleConnected && spreadsheetUrl" :href="spreadsheetUrl" target="_blank" rel="noopener" class="lf-btn-ghost whitespace-nowrap">シートを見る</a>
        <a v-if="!googleConnected" href="/api/life/google/connect" class="lf-btn whitespace-nowrap">連携する</a>
        <button v-else class="lf-btn-ghost whitespace-nowrap" @click="disconnectGoogle">解除</button>
      </section>

      <!-- テーマカード -->
      <section class="grid gap-3 sm:grid-cols-2">
        <button
          v-for="t in themes"
          :key="t.id"
          class="lf-card px-4 py-4 text-left transition-transform hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          :disabled="!googleConnected"
          @click="openTheme(t.id)"
        >
          <p class="text-2xl mb-1">{{ t.emoji }}</p>
          <p class="text-sm font-semibold">{{ t.label }}</p>
          <p class="text-[11px] text-[var(--lf-ink-faint)] mt-0.5">{{ t.ageHint }}</p>
          <p class="text-xs text-[var(--lf-ink-soft)] mt-2 leading-relaxed">{{ t.description }}</p>
        </button>
      </section>
      <p v-if="!googleConnected" class="text-xs text-[var(--lf-ink-faint)] text-center mt-4">
        Googleと連携すると、テーマを選んで話せるようになります。
      </p>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import { LIFE_THEMES } from '~/utils/life-themes'

definePageMeta({ layout: 'life' })
useHead({ title: 'life — 人生のインタビュー' })

const route = useRoute()
const router = useRouter()
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const themes = LIFE_THEMES
const googleConnected = ref(false)
const spreadsheetUrl = ref('')
const errorMessage = ref('')

async function loadGoogleStatus() {
  try {
    const status = await $fetch<{ connected: boolean; spreadsheetUrl?: string }>('/api/life/google/status')
    googleConnected.value = status.connected
    spreadsheetUrl.value = status.spreadsheetUrl ?? ''
  } catch { /* 未ログイン時は未連携のまま */ }
}

async function disconnectGoogle() {
  if (!confirm('Google連携を解除しますか？（作成済みのスプレッドシート自体は削除されません）')) return
  await $fetch('/api/life/google/disconnect', { method: 'POST' })
  googleConnected.value = false
  spreadsheetUrl.value = ''
}

function openTheme(id: string) {
  if (!googleConnected.value) return
  router.push(`/life/${id}`)
}

watch(isLoggedIn, async (v) => {
  if (v) await loadGoogleStatus()
})

onMounted(async () => {
  if (route.query.life_error) errorMessage.value = String(route.query.life_error)
  await checkAuth()
  if (isLoggedIn.value) await loadGoogleStatus()
})
</script>
