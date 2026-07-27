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
        <div class="mb-3">
          <button type="button" class="gh-btn-ghost !h-9" @click="importOpen = true">✎ テキストを貼り付けてAIで取り込み</button>
        </div>

        <ul class="space-y-2.5">
          <li v-for="t in tips" :key="t._k" class="rounded-2xl border border-[color-mix(in_srgb,var(--gh-persimmon)_35%,var(--gh-line))] bg-[#fdf6ee] p-3.5">
            <div class="flex items-center gap-2 mb-2">
              <input v-model="t.category" class="gh-input !w-[8.5rem] !py-1.5 text-[13px]" placeholder="分類" list="gh-tip-categories" />
              <input v-model="t.title" class="gh-input !py-1.5 text-[13px]" placeholder="見出し（例：高野山のおすすめ）" />
              <button type="button" class="shrink-0 w-8 h-8 rounded-full text-[var(--gh-ink-faint)] hover:bg-black/[0.05] hover:text-[var(--gh-warn)] transition" title="削除" @click="removeAt(t)">✕</button>
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

    <!-- AI取り込みモーダル -->
    <div v-if="importOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]" @click.self="closeImport">
      <div class="w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <h2 class="gh-display font-bold text-[17px] mb-1">テキストからAIで取り込み</h2>
        <p class="text-[12px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
          観光メモや案内文を貼り付けると、AIが話題ごとに分割します。
          <span class="text-[var(--gh-forest-deep)] font-bold">既存の項目と同じ話題は自動でまとめ（差分マージ）</span>ます。追加前に内容をご確認ください。
        </p>

        <template v-if="!candidates.length">
          <textarea v-model="importText" rows="8" class="gh-input text-[13px]" placeholder="ここに観光メモ・案内文などを貼り付け…" />
          <div v-if="extractError" class="mt-2 text-[12.5px] text-[var(--gh-warn)]">{{ extractError }}</div>
          <div class="flex gap-2 mt-4">
            <button type="button" class="gh-btn-ghost flex-1" @click="closeImport">閉じる</button>
            <button type="button" class="gh-btn flex-1" :disabled="extracting || !importText.trim()" @click="runExtract">
              {{ extracting ? '抽出中…' : 'AIで抽出' }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="text-[12px] font-bold mb-1.5">抽出結果（{{ selectedCount }} / {{ candidates.length }} 件を反映）</p>
          <ul class="space-y-2 mb-3">
            <li v-for="(c, i) in candidates" :key="i" class="rounded-xl border p-3 transition"
              :class="c.selected ? 'border-[var(--gh-forest-soft)] bg-white/50' : 'border-[var(--gh-line)] bg-black/[0.02] opacity-60'">
              <div class="flex items-start gap-2">
                <input v-model="c.selected" type="checkbox" class="mt-1 accent-[var(--gh-forest)]" />
                <div class="flex-1 min-w-0 space-y-1.5">
                  <span v-if="c.mergeId" class="inline-block text-[10.5px] font-bold text-[var(--gh-forest-deep)] bg-[#eef3e9] rounded-full px-2 py-0.5">
                    既存を更新：{{ mergeTitle(c.mergeId) }}
                  </span>
                  <span v-else class="inline-block text-[10.5px] font-bold text-[var(--gh-persimmon)] bg-[#fdf0e4] rounded-full px-2 py-0.5">新規</span>
                  <div class="flex gap-1.5">
                    <input v-model="c.category" class="gh-input !w-[8rem] !py-1 text-[12.5px]" placeholder="分類" list="gh-tip-categories" />
                    <input v-model="c.title" class="gh-input !py-1 text-[12.5px]" placeholder="見出し" />
                  </div>
                  <textarea v-model="c.body" rows="3" class="gh-input !py-1 text-[12.5px]" placeholder="内容" />
                </div>
              </div>
            </li>
          </ul>

          <div v-if="droppedList.length" class="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--gh-warn)_30%,transparent)] bg-[#fbf3e4] p-3">
            <p class="text-[11.5px] font-bold text-[var(--gh-warn)] mb-1">取り込まなかったもの</p>
            <ul class="space-y-0.5">
              <li v-for="(d, i) in droppedList" :key="i" class="text-[11.5px] text-[var(--gh-ink-soft)] leading-relaxed">・{{ d }}</li>
            </ul>
          </div>

          <p class="text-[11px] text-[var(--gh-ink-faint)] mb-2">※ 反映後、下の「保存する」で確定してください。</p>
          <div class="flex gap-2">
            <button type="button" class="gh-btn-ghost flex-1" @click="resetImport">やり直す</button>
            <button type="button" class="gh-btn flex-1" :disabled="!selectedCount" @click="applyImport">反映する</button>
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
import type { ExtractedTip, Tip, TipExtractResult } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })
useHead({ title: '旅の情報 | ゲストハウス案内' })

const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

interface TipForm {
  _k: number
  id?: string // 既存項目のid（差分マージのターゲット）。新規は undefined。
  category: string
  title: string
  body: string
}
let keySeq = 0
const tips = ref<TipForm[]>([])
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const notAdmin = ref(false)
const errorMsg = ref('')

const TIP_PRESETS = ['高野山', '観光', '食事', '近隣', '季節の見どころ', '体験', 'アクセス']

function add() {
  tips.value.push({ _k: keySeq++, category: '', title: '', body: '' })
}
function removeAt(t: TipForm) {
  const i = tips.value.indexOf(t)
  if (i >= 0) tips.value.splice(i, 1)
}

function mapRows(list: Tip[]) {
  return list.map((t) => ({ _k: keySeq++, id: t.id, category: t.category, title: t.title, body: t.body }))
}

async function load() {
  loading.value = true
  try {
    const list = await $fetch<Tip[]>('/api/guesthouse/tips')
    tips.value = mapRows(list)
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
    const payload = tips.value.map((t) => ({ category: t.category, title: t.title, body: t.body }))
    const list = await $fetch<Tip[]>('/api/guesthouse/tips', { method: 'PUT', body: { tips: payload } })
    tips.value = mapRows(list)
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}

// ── AI取り込み（貼り付け→抽出→差分マージ確認→反映）──
interface Candidate extends ExtractedTip {
  selected: boolean
}
const importOpen = ref(false)
const importText = ref('')
const extracting = ref(false)
const extractError = ref('')
const candidates = ref<Candidate[]>([])
const droppedList = ref<string[]>([])

const selectedCount = computed(() => candidates.value.filter((c) => c.selected).length)

function mergeTitle(id: string): string {
  return tips.value.find((t) => t.id === id)?.title || '既存の項目'
}

function resetImport() {
  candidates.value = []
  droppedList.value = []
  extractError.value = ''
}
function closeImport() {
  importOpen.value = false
  importText.value = ''
  resetImport()
}

async function runExtract() {
  const text = importText.value.trim()
  if (!text || extracting.value) return
  extracting.value = true
  extractError.value = ''
  try {
    const res = await $fetch<TipExtractResult>('/api/guesthouse/tips/extract', { method: 'POST', body: { text } })
    candidates.value = res.items.map((it) => ({ ...it, selected: true }))
    droppedList.value = res.dropped
    if (!candidates.value.length) extractError.value = '取り込める旅の情報が見つかりませんでした。文面をご確認ください。'
  } catch (e: any) {
    extractError.value = e?.data?.message || '抽出に失敗しました。もう一度お試しください。'
  } finally {
    extracting.value = false
  }
}

function applyImport() {
  for (const c of candidates.value) {
    if (!c.selected) continue
    if (c.mergeId) {
      const row = tips.value.find((t) => t.id === c.mergeId)
      if (row) {
        row.category = c.category
        row.title = c.title
        row.body = c.body
        continue
      }
    }
    tips.value.push({ _k: keySeq++, category: c.category, title: c.title, body: c.body })
  }
  closeImport()
}

onMounted(async () => {
  await checkAuth()
  if (isLoggedIn.value) await load()
  else loading.value = false
})
</script>
