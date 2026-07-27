<template>
  <div class="max-w-[760px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center gap-2 mb-1">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 管理トップ</NuxtLink>
    </div>
    <h1 class="gh-display text-[22px] font-bold mb-1">宿の情報</h1>
    <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-5">
      宿ごとにコンセプトと事務案内（駐車場・鍵・Wi-Fi・ゴミ出しなど）を登録し、お客様用の共有リンク・QRを発行します。
    </p>

    <div class="mb-5">
      <NuxtLink to="/guesthouse/new" class="gh-btn inline-flex items-center">＋ 宿を追加</NuxtLink>
    </div>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-20 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <p v-else-if="!houses.length" class="text-center text-[var(--gh-ink-soft)] py-16 text-[14px]">
        まだ宿がありません。「＋ 宿を追加」から柿畑の宿・高野口の宿などを登録できます。
      </p>
      <ul v-else class="space-y-2.5">
        <li v-for="h in houses" :key="h.id">
          <NuxtLink :to="`/guesthouse/${h.id}`" class="block rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3.5 transition hover:border-[var(--gh-forest-soft)] gh-rise">
            <div class="flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="gh-display font-bold text-[16px] truncate">{{ h.name }}</p>
                <p class="text-[12px] text-[var(--gh-ink-soft)] mt-0.5">案内 {{ h.factCount }} 件 ・ 更新 {{ formatDate(h.updatedAt) }}</p>
              </div>
              <span class="gh-chip shrink-0">編集 →</span>
            </div>
          </NuxtLink>
        </li>
      </ul>
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
useHead({ title: '宿の情報 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const houses = ref<HouseSummary[]>([])
const loading = ref(true)
const notAdmin = ref(false)

async function load() {
  loading.value = true
  try {
    houses.value = await $fetch<HouseSummary[]>('/api/guesthouse/houses')
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    houses.value = []
  } finally {
    loading.value = false
  }
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
