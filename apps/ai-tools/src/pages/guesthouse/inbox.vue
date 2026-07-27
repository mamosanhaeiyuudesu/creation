<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center gap-2 mb-1">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 宿一覧</NuxtLink>
    </div>
    <h1 class="gh-display text-[22px] font-bold mb-1">相談の受信箱</h1>
    <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-5">
      AIが答えられなかった「心のこもった相談」です。AIの下書きを確認・修正して送ると、お客様に<b>「阪中さん」</b>として届きます。
    </p>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 2" :key="i" class="h-40 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <p v-else-if="!consults.length" class="text-center text-[var(--gh-ink-soft)] py-16 text-[14px]">
        未対応の相談はありません。
      </p>

      <ul v-else class="space-y-3">
        <li v-for="c in consults" :key="c.id" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 gh-rise">
          <div class="flex items-center gap-2 mb-2 text-[12px] text-[var(--gh-ink-soft)]">
            <span class="gh-chip !py-0.5 !px-2">{{ c.houseName }}</span>
            <span v-if="c.guestName">{{ c.guestName }} さん</span>
            <NuxtLink :to="`/guesthouse/session/${c.sessionId}`" class="ml-auto text-[var(--gh-forest-deep)] underline underline-offset-2">
              会話を見る
            </NuxtLink>
          </div>

          <div class="rounded-xl bg-[#fbf3e4] border border-[color-mix(in_srgb,var(--gh-warn)_30%,transparent)] px-3 py-2 mb-3">
            <p class="text-[11px] font-bold text-[var(--gh-warn)] mb-0.5">お客様の相談</p>
            <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ c.question }}</p>
          </div>

          <label class="text-[12px] font-bold block mb-1">AIの下書き（編集できます）</label>
          <textarea v-model="c.draft" rows="5" class="gh-input text-[13.5px]" placeholder="返信内容…" />

          <div v-if="c.error" class="mt-2 text-[12.5px] text-[var(--gh-warn)]">{{ c.error }}</div>

          <div class="flex gap-2 mt-3">
            <button class="gh-btn-ghost" :disabled="c.busy" @click="dismiss(c)">見送る</button>
            <button class="gh-btn flex-1" :disabled="c.busy || !c.draft.trim()" @click="answer(c)">
              {{ c.busy ? '送信中…' : '承認して送信' }}
            </button>
          </div>
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
import type { Consult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '相談の受信箱 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

interface Row extends Consult {
  busy: boolean
  error: string
}
const consults = ref<Row[]>([])
const loading = ref(true)
const notAdmin = ref(false)

async function load() {
  loading.value = true
  try {
    const list = await $fetch<Consult[]>('/api/guesthouse/consults')
    consults.value = list.map((c) => ({ ...c, busy: false, error: '' }))
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    consults.value = []
  } finally {
    loading.value = false
  }
}

async function answer(c: Row) {
  if (!c.draft.trim()) return
  c.busy = true
  c.error = ''
  try {
    await $fetch(`/api/guesthouse/consults/${c.id}/answer`, { method: 'POST', body: { answer: c.draft } })
    consults.value = consults.value.filter((x) => x.id !== c.id)
  } catch (e: any) {
    c.error = e?.data?.message || '送信に失敗しました。'
    c.busy = false
  }
}

async function dismiss(c: Row) {
  c.busy = true
  try {
    await $fetch(`/api/guesthouse/consults/${c.id}/dismiss`, { method: 'POST' })
    consults.value = consults.value.filter((x) => x.id !== c.id)
  } catch (e: any) {
    c.error = e?.data?.message || '操作に失敗しました。'
    c.busy = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
