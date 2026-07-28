<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <Breadcrumb class="mb-2" :items="[{ label: '管理トップ', to: '/guesthouse' }, { label: 'レビュー・意見' }]" />
    <h1 class="gh-display text-[22px] font-bold mb-4 flex items-center gap-2">
      レビュー・意見
      <HelpTip label="このページの説明">
        予約サイトの口コミ・アンケート・お客様の声などのテキストを登録します。<b>お客さん日記と合わせて「傾向」の分析材料</b>になります。出典（Airbnb・アンケートなど）を付けておくと整理しやすいです。
      </HelpTip>
    </h1>

    <div v-if="notAdmin" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-10 text-center">
      <p class="text-[15px] font-bold mb-1">管理者専用のページです</p>
    </div>

    <template v-else>
      <div class="flex flex-wrap items-center gap-2 mb-5">
        <button type="button" class="gh-btn inline-flex items-center" @click="openNew">＋ 手動で追加</button>
        <button type="button" class="gh-btn-ghost !h-10 inline-flex items-center" @click="openImport">✒️ テキストを貼ってAI取込</button>
      </div>

      <div v-if="loading" class="space-y-2">
        <div v-for="i in 3" :key="i" class="h-20 rounded-2xl bg-[var(--gh-paper-2)]/70 animate-pulse" />
      </div>
      <p v-else-if="!reviews.length" class="text-center text-[var(--gh-ink-soft)] py-16 text-[14px]">
        まだレビュー・意見がありません。「手動で追加」またはテキストを貼り付けて取り込めます。
      </p>
      <ul v-else class="space-y-2.5">
        <li v-for="r in reviews" :key="r.id" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
          <div class="flex items-center gap-2 mb-1.5">
            <span v-if="r.source" class="gh-chip !py-0.5 !px-2 !text-[11px]">{{ r.source }}</span>
            <span v-else class="text-[11px] text-[var(--gh-ink-faint)]">出典なし</span>
            <div class="ml-auto flex items-center gap-3">
              <button class="text-[12px] text-[var(--gh-forest-deep)] hover:underline underline-offset-2" @click="openEdit(r)">編集</button>
              <button class="text-[12px] text-[var(--gh-ink-faint)] hover:text-[var(--gh-warn)]" @click="remove(r)">削除</button>
            </div>
          </div>
          <p class="text-[13px] leading-relaxed whitespace-pre-wrap">{{ r.body }}</p>
        </li>
      </ul>

      <p class="text-[11.5px] text-[var(--gh-ink-faint)] mt-6 leading-relaxed">
        ここに登録した内容は、管理トップの「傾向」で日記と合わせて分析されます（傾向の「更新」で反映）。
      </p>
    </template>

    <!-- 追加・編集モーダル -->
    <div v-if="editorOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]" @click.self="editorOpen = false">
      <div class="w-full max-w-[520px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <h2 class="gh-display font-bold text-[17px] mb-3">{{ editId ? 'レビューを編集' : 'レビュー・意見を追加' }}</h2>
        <label class="gh-dlabel">出典（任意・例: Airbnb / アンケート / 口コミ）</label>
        <input v-model="form.source" class="gh-input text-[13.5px] mb-3" placeholder="Airbnb など" />
        <label class="gh-dlabel">本文</label>
        <textarea v-model="form.body" rows="7" class="gh-input text-[13.5px]" placeholder="お客様の声・口コミ・アンケートの内容を貼り付け…" />
        <p v-if="editorError" class="text-[12.5px] text-[var(--gh-warn)] mt-2">{{ editorError }}</p>
        <div class="flex gap-2 mt-4">
          <button class="gh-btn-ghost flex-1" :disabled="saving" @click="editorOpen = false">キャンセル</button>
          <button class="gh-btn flex-1" :disabled="saving || !form.body.trim()" @click="saveEditor">{{ saving ? '保存中…' : '保存する' }}</button>
        </div>
      </div>
    </div>

    <!-- AI取り込みモーダル -->
    <div v-if="importOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]" @click.self="closeImport">
      <div class="w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <h2 class="gh-display font-bold text-[17px] mb-1">テキストを貼ってAIで取り込み</h2>
        <p class="text-[12px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
          口コミやアンケートをまとめて貼り付けると、AIが<b>1件ずつの声に切り分け</b>ます。取り込む前に内容をご確認ください。
        </p>

        <template v-if="!candidates.length">
          <label class="gh-dlabel">出典（任意・取り込む全件に付きます）</label>
          <input v-model="importSource" class="gh-input text-[13.5px] mb-3" placeholder="Airbnb 2024夏 など" />
          <textarea v-model="importText" rows="8" class="gh-input text-[13px]" placeholder="ここに口コミ・アンケート・お客様の声を貼り付け…" />
          <p v-if="importError" class="text-[12.5px] text-[var(--gh-warn)] mt-2">{{ importError }}</p>
          <div class="flex gap-2 mt-4">
            <button class="gh-btn-ghost flex-1" @click="closeImport">キャンセル</button>
            <button class="gh-btn flex-1" :disabled="extracting || !importText.trim()" @click="runExtract">{{ extracting ? '解析中…' : 'AIで切り分ける' }}</button>
          </div>
        </template>

        <template v-else>
          <p class="text-[12px] font-bold mb-1.5">切り分け結果（{{ selectedCount }} / {{ candidates.length }} 件を取り込み）</p>
          <ul class="space-y-2 mb-3">
            <li v-for="(c, i) in candidates" :key="i" class="rounded-xl border border-[var(--gh-line)] bg-[var(--gh-paper)] p-3">
              <label class="flex gap-2 items-start cursor-pointer">
                <input v-model="c.selected" type="checkbox" class="mt-1 shrink-0" />
                <span class="text-[12.5px] leading-relaxed whitespace-pre-wrap">{{ c.body }}</span>
              </label>
            </li>
          </ul>
          <p v-if="importError" class="text-[12.5px] text-[var(--gh-warn)] mt-1">{{ importError }}</p>
          <div class="flex gap-2 mt-2">
            <button class="gh-btn-ghost flex-1" :disabled="savingImport" @click="candidates = []">戻る</button>
            <button class="gh-btn flex-1" :disabled="savingImport || !selectedCount" @click="saveImport">{{ savingImport ? '保存中…' : `${selectedCount}件を保存` }}</button>
          </div>
        </template>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="orange" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import HelpTip from '~/components/guesthouse/HelpTip.vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import type { Review, ReviewExtractResult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: 'レビュー・意見 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const reviews = ref<Review[]>([])
const loading = ref(true)
const notAdmin = ref(false)

// 追加・編集
const editorOpen = ref(false)
const editId = ref<string | null>(null)
const form = ref({ source: '', body: '' })
const saving = ref(false)
const editorError = ref('')

// AI取り込み
const importOpen = ref(false)
const importText = ref('')
const importSource = ref('')
const extracting = ref(false)
const candidates = ref<{ body: string; selected: boolean }[]>([])
const importError = ref('')
const savingImport = ref(false)
const selectedCount = computed(() => candidates.value.filter((c) => c.selected).length)

async function load() {
  loading.value = true
  try {
    reviews.value = await $fetch<Review[]>('/api/guesthouse/reviews')
  } catch (e: any) {
    if ((e?.statusCode ?? e?.response?.status) === 403) notAdmin.value = true
    reviews.value = []
  } finally {
    loading.value = false
  }
}

function openNew() {
  editId.value = null
  form.value = { source: '', body: '' }
  editorError.value = ''
  editorOpen.value = true
}
function openEdit(r: Review) {
  editId.value = r.id
  form.value = { source: r.source, body: r.body }
  editorError.value = ''
  editorOpen.value = true
}

async function saveEditor() {
  if (!form.value.body.trim()) return
  saving.value = true
  editorError.value = ''
  try {
    if (editId.value) {
      await $fetch(`/api/guesthouse/reviews/${editId.value}`, { method: 'PUT', body: form.value })
    } else {
      await $fetch('/api/guesthouse/reviews', { method: 'POST', body: form.value })
    }
    editorOpen.value = false
    await load()
  } catch (e: any) {
    editorError.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}

async function remove(r: Review) {
  if (!confirm('このレビュー・意見を削除しますか？')) return
  try {
    await $fetch(`/api/guesthouse/reviews/${r.id}`, { method: 'DELETE' })
    await load()
  } catch {
    /* noop */
  }
}

function openImport() {
  importText.value = ''
  importSource.value = ''
  candidates.value = []
  importError.value = ''
  importOpen.value = true
}
function closeImport() {
  importOpen.value = false
}

async function runExtract() {
  if (!importText.value.trim()) return
  extracting.value = true
  importError.value = ''
  try {
    const res = await $fetch<ReviewExtractResult>('/api/guesthouse/reviews/extract', { method: 'POST', body: { text: importText.value } })
    candidates.value = (res.items ?? []).map((it) => ({ body: it.body, selected: true }))
    if (!candidates.value.length) importError.value = '切り分けられる内容が見つかりませんでした。'
  } catch (e: any) {
    importError.value = e?.data?.message || '取り込みに失敗しました。'
  } finally {
    extracting.value = false
  }
}

async function saveImport() {
  const picked = candidates.value.filter((c) => c.selected)
  if (!picked.length) return
  savingImport.value = true
  importError.value = ''
  try {
    for (const c of picked) {
      await $fetch('/api/guesthouse/reviews', { method: 'POST', body: { source: importSource.value, body: c.body } })
    }
    importOpen.value = false
    await load()
  } catch (e: any) {
    importError.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    savingImport.value = false
  }
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>

<style scoped>
.gh-dlabel {
  display: block;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--gh-ink-soft);
  margin-bottom: 0.25rem;
}
</style>
