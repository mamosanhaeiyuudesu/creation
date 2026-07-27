<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center gap-2 mb-1">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 管理トップ</NuxtLink>
    </div>
    <h1 class="gh-display text-[22px] font-bold mb-1">旅の情報</h1>
    <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-5">
      高野山・観光・食事などのおすすめを、すべての宿で共通に使う情報として登録します。
      <b>お客様には自動応答しません</b>。観光の相談が来たとき、AIが「阪中さんの返信」の下書きを作る素材として使います。
    </p>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-24 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>

      <template v-else>
        <ul class="space-y-2.5">
          <li v-for="(t, i) in tips" :key="i" class="rounded-2xl border border-[color-mix(in_srgb,var(--gh-persimmon)_35%,var(--gh-line))] bg-[#fdf6ee] p-3.5">
            <div class="flex items-center gap-2 mb-2">
              <input v-model="t.category" class="gh-input !w-[8.5rem] !py-1.5 text-[13px]" placeholder="分類" list="gh-tip-categories" />
              <input v-model="t.title" class="gh-input !py-1.5 text-[13px]" placeholder="見出し（例：高野山のおすすめ）" />
              <button type="button" class="shrink-0 w-8 h-8 rounded-full text-[var(--gh-ink-faint)] hover:bg-black/[0.05] hover:text-[var(--gh-warn)] transition" title="削除" @click="tips.splice(i, 1)">✕</button>
            </div>
            <textarea v-model="t.body" rows="3" class="gh-input text-[13px]" placeholder="内容（例：奥之院は朝が静かでおすすめ。バスは○○発が便利…）" />
          </li>
        </ul>

        <datalist id="gh-tip-categories">
          <option v-for="c in TIP_PRESETS" :key="c" :value="c" />
        </datalist>

        <button type="button" class="gh-btn-ghost !h-9 mt-2.5" @click="add()">＋ 旅の情報を追加</button>

        <div v-if="errorMsg" class="mt-4 text-[13px] text-[var(--gh-warn)]">{{ errorMsg }}</div>

        <div class="mt-6">
          <button class="gh-btn w-full" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : saved ? '保存しました' : '保存する' }}
          </button>
        </div>
      </template>
    </template>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import type { Tip } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '旅の情報 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

interface TipForm {
  category: string
  title: string
  body: string
}
const tips = ref<TipForm[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const notAdmin = ref(false)
const errorMsg = ref('')

const TIP_PRESETS = ['高野山', '観光', '食事', '近隣', '季節の見どころ', '体験', 'アクセス']

function add() {
  tips.value.push({ category: '', title: '', body: '' })
}

async function load() {
  loading.value = true
  try {
    const list = await $fetch<Tip[]>('/api/guesthouse/tips')
    tips.value = list.map((t) => ({ category: t.category, title: t.title, body: t.body }))
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    tips.value = []
  } finally {
    loading.value = false
  }
}

async function save() {
  saving.value = true
  saved.value = false
  errorMsg.value = ''
  try {
    const list = await $fetch<Tip[]>('/api/guesthouse/tips', { method: 'PUT', body: { tips: tips.value } })
    tips.value = list.map((t) => ({ category: t.category, title: t.title, body: t.body }))
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
