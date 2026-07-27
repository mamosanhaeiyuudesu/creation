<template>
  <div class="max-w-[860px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🏡</span>
        <div>
          <h1 class="gh-display text-[22px] sm:text-[26px] font-bold leading-none">ゲストハウス案内</h1>
          <p class="text-[12px] text-[var(--gh-ink-soft)] mt-1">チェックイン案内チャット（フェーズ1）</p>
        </div>
      </div>
      <button v-if="isLoggedIn" class="text-[13px] text-[var(--gh-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
    </div>

    <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-5">
      宿ごとに案内情報（駐車場・鍵・Wi-Fi・ゴミ出しなど）を登録すると、お客様が共有リンクからAIに質問できます。<br class="hidden sm:block" />
      事務的なことはAIが即答し、観光の相談やトラブルは正直に「阪中さんに確認します」と引き継ぎます。
    </p>

    <!-- 管理者以外にはメッセージだけ表示 -->
    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
      <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed">
        このページはゲストハウス運営者（管理者）のみが利用できます。<br />
        お客様は、お渡しした共有リンク・QRコードからチャットをご利用ください。
      </p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <NuxtLink to="/guesthouse/new" class="gh-btn inline-flex items-center">＋ 宿を追加</NuxtLink>
        <NuxtLink to="/guesthouse/inbox" class="gh-btn-ghost inline-flex items-center">
          相談の受信箱
          <span v-if="pendingCount" class="ml-1.5 inline-grid place-items-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--gh-warn)] text-white text-[11px]">{{ pendingCount }}</span>
        </NuxtLink>
      </div>

    <!-- ローディング -->
    <div v-if="loading" class="space-y-2">
      <div v-for="i in 3" :key="i" class="h-20 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
    </div>

    <template v-else>
      <p v-if="!houses.length" class="text-center text-[var(--gh-ink-soft)] py-16 text-[14px]">
        まだ宿がありません。「＋ 宿を追加」から柿畑の宿・高野口の宿などを登録できます。
      </p>
      <ul v-else class="space-y-2.5">
        <li v-for="h in houses" :key="h.id">
          <NuxtLink
            :to="`/guesthouse/${h.id}`"
            class="block rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3.5 transition hover:border-[var(--gh-forest-soft)] gh-rise"
          >
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="gh-display font-bold text-[16px] truncate">{{ h.name }}</p>
                <p class="text-[12px] text-[var(--gh-ink-soft)] mt-0.5">
                  案内 {{ h.factCount }} 件 ・ 更新 {{ formatDate(h.updatedAt) }}
                </p>
              </div>
              <span class="gh-chip shrink-0">編集 →</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
    </template>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import type { HouseSummary } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: 'ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const houses = ref<HouseSummary[]>([])
const loading = ref(true)
const notAdmin = ref(false)
const pendingCount = ref(0)

async function load() {
  loading.value = true
  try {
    houses.value = await $fetch<HouseSummary[]>('/api/guesthouse/houses')
  } catch (e: any) {
    // ログイン済みだが管理者でない場合は 403。専用メッセージを出す。
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    houses.value = []
  } finally {
    loading.value = false
  }
  // 受信箱の未対応件数（失敗しても無視）
  try {
    const consults = await $fetch<unknown[]>('/api/guesthouse/consults')
    pendingCount.value = consults.length
  } catch {
    pendingCount.value = 0
  }
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
