<template>
  <div class="space-y-5">
    <!-- 宿名 -->
    <div>
      <label class="gh-label">宿名</label>
      <input v-model="form.name" class="gh-input" placeholder="例：柿畑の宿" />
    </div>

    <!-- ウェルカム文・コンセプト -->
    <div>
      <label class="gh-label">ウェルカム文・宿のコンセプト</label>
      <p class="gh-hint">チャットの冒頭でお客様に表示され、AIの前提にもなります。</p>
      <textarea v-model="form.welcome" rows="3" class="gh-input" placeholder="例：柿畑に囲まれた小さな農家の宿です。ゆっくりお過ごしください。" />
    </div>

    <!-- 事務案内（info）-->
    <div>
      <div class="flex items-center justify-between mb-1">
        <label class="gh-label !mb-0">事務案内（AIが即答する内容）</label>
        <span class="text-[11px] text-[var(--gh-ink-faint)]">{{ infoFacts.length }} 件</span>
      </div>
      <p class="gh-hint">駐車場・鍵・チェックイン方法・Wi-Fi・ゴミ出しなど、答えが決まっている事務的なこと。お客様チャットでそのまま自動応答されます。</p>

      <div class="flex flex-wrap gap-2 mb-3">
        <button type="button" class="gh-btn-ghost !h-9" @click="importOpen = true">✎ AIで会話・メモから取り込み</button>
        <button v-if="!infoFacts.length" type="button" class="gh-btn-ghost !h-9" @click="addStarters">よくある項目のひな形を入れる</button>
      </div>

      <ul class="space-y-2.5">
        <li v-for="f in infoFacts" :key="f._k" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-3.5">
          <div class="flex items-center gap-2 mb-2">
            <input v-model="f.category" class="gh-input !w-[8.5rem] !py-1.5 text-[13px]" placeholder="分類" list="gh-categories" />
            <input v-model="f.title" class="gh-input !py-1.5 text-[13px]" placeholder="見出し（例：駐車場はどこ？）" />
            <button type="button" class="shrink-0 w-8 h-8 rounded-full text-[var(--gh-ink-faint)] hover:bg-black/[0.05] hover:text-[var(--gh-warn)] transition" title="削除" @click="remove(f)">✕</button>
          </div>
          <textarea v-model="f.body" rows="2" class="gh-input text-[13px]" placeholder="回答本文（例：宿の前に2台分あります。到着したら…）" />
        </li>
      </ul>
      <button type="button" class="gh-btn-ghost !h-9 mt-2.5" @click="add()">＋ 事務案内を追加</button>
    </div>

    <p class="gh-hint !mb-0">
      観光・高野山・食事などの「旅の情報」は、<b>「旅の情報」ページ</b>でホスト共通としてまとめて登録します（相談の下書きに使われます）。
    </p>

    <datalist id="gh-categories">
      <option v-for="c in CATEGORY_PRESETS" :key="c" :value="c" />
    </datalist>

    <!-- AI取り込みモーダル -->
    <div v-if="importOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]" @click.self="closeImport">
      <div class="w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <h2 class="gh-display font-bold text-[17px] mb-1">AIで会話・メモから取り込み</h2>
        <p class="text-[12px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
          既存のウェルカム文・メモ・会話ログを貼り付けると、AIが事務案内（駐車場・鍵・Wi-Fiなど）を抜き出します。<br />
          <span class="text-[var(--gh-warn)] font-bold">お客様の氏名や日付などの個人情報・一回限りの内容は自動で除外</span>します。追加前に必ず内容をご確認ください。
        </p>

        <template v-if="!candidates.length">
          <textarea v-model="importText" rows="8" class="gh-input text-[13px]" placeholder="ここにウェルカムメッセージや会話ログを貼り付け…" />
          <div v-if="extractError" class="mt-2 text-[12.5px] text-[var(--gh-warn)]">{{ extractError }}</div>
          <div class="flex gap-2 mt-4">
            <button type="button" class="gh-btn-ghost flex-1" @click="closeImport">閉じる</button>
            <button type="button" class="gh-btn flex-1" :disabled="extracting || !importText.trim()" @click="runExtract">
              {{ extracting ? '抽出中…' : 'AIで抽出' }}
            </button>
          </div>
        </template>

        <template v-else>
          <div v-if="welcomeSuggestion" class="mb-4 rounded-xl border border-[var(--gh-line)] bg-white/40 p-3">
            <div class="flex items-center justify-between mb-1">
              <p class="text-[12px] font-bold">ウェルカム文の候補</p>
              <label class="flex items-center gap-1.5 text-[12px] cursor-pointer">
                <input v-model="applyWelcome" type="checkbox" class="accent-[var(--gh-forest)]" />
                <span>{{ form.welcome.trim() ? '上書きする' : '反映する' }}</span>
              </label>
            </div>
            <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed whitespace-pre-wrap">{{ welcomeSuggestion }}</p>
          </div>

          <p class="text-[12px] font-bold mb-1.5">抽出された事務案内（{{ selectedCount }} / {{ candidates.length }} 件を追加）</p>
          <ul class="space-y-2 mb-3">
            <li v-for="(c, i) in candidates" :key="i" class="rounded-xl border p-3 transition"
              :class="c.selected ? 'border-[var(--gh-forest-soft)] bg-white/50' : 'border-[var(--gh-line)] bg-black/[0.02] opacity-60'">
              <div class="flex items-start gap-2">
                <input v-model="c.selected" type="checkbox" class="mt-1 accent-[var(--gh-forest)]" />
                <div class="flex-1 min-w-0 space-y-1.5">
                  <div class="flex gap-1.5">
                    <input v-model="c.category" class="gh-input !w-[8rem] !py-1 text-[12.5px]" placeholder="分類" list="gh-categories" />
                    <input v-model="c.title" class="gh-input !py-1 text-[12.5px]" placeholder="見出し" />
                  </div>
                  <textarea v-model="c.body" rows="2" class="gh-input !py-1 text-[12.5px]" placeholder="回答本文" />
                </div>
              </div>
            </li>
          </ul>

          <div v-if="droppedList.length" class="mb-3 rounded-xl border border-[color-mix(in_srgb,var(--gh-warn)_30%,transparent)] bg-[#fbf3e4] p-3">
            <p class="text-[11.5px] font-bold text-[var(--gh-warn)] mb-1">個人情報・一回限りの内容として除外したもの</p>
            <ul class="space-y-0.5">
              <li v-for="(d, i) in droppedList" :key="i" class="text-[11.5px] text-[var(--gh-ink-soft)] leading-relaxed">・{{ d }}</li>
            </ul>
          </div>

          <div class="flex gap-2">
            <button type="button" class="gh-btn-ghost flex-1" @click="resetImport">やり直す</button>
            <button type="button" class="gh-btn flex-1" :disabled="!selectedCount && !(welcomeSuggestion && applyWelcome)" @click="applyImport">追加する</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import type { ExtractResult, FactType } from '~/types/guesthouse'

interface FactForm {
  _k: number // v-for キー（type で分割表示しても安定させる）
  category: string
  title: string
  body: string
  type: FactType
}
interface HouseFormModel {
  name: string
  welcome: string
  facts: { category: string; title: string; body: string; type: FactType }[]
}

const props = defineProps<{ modelValue: HouseFormModel }>()
const emit = defineEmits<{ 'update:modelValue': [HouseFormModel] }>()

let keySeq = 0
const form = reactive({
  name: props.modelValue.name,
  welcome: props.modelValue.welcome,
  facts: props.modelValue.facts.map((f) => ({ _k: keySeq++, category: f.category, title: f.title, body: f.body, type: f.type ?? 'info' })) as FactForm[],
})

watch(
  form,
  () =>
    emit('update:modelValue', {
      name: form.name,
      welcome: form.welcome,
      facts: form.facts.map((f) => ({ category: f.category, title: f.title, body: f.body, type: f.type })),
    }),
  { deep: true }
)

const infoFacts = computed(() => form.facts.filter((f) => f.type === 'info'))

const CATEGORY_PRESETS = ['駐車場', '鍵・チェックイン', 'チェックアウト', 'Wi-Fi', 'ゴミ出し', 'アクセス・地図', '設備', 'その他']

function add(category = '', title = '') {
  form.facts.push({ _k: keySeq++, category, title, body: '', type: 'info' })
}
function remove(f: FactForm) {
  const i = form.facts.indexOf(f)
  if (i >= 0) form.facts.splice(i, 1)
}
function addStarters() {
  const starters: [string, string][] = [
    ['駐車場', '駐車場はどこですか？'],
    ['鍵・チェックイン', 'チェックイン方法・鍵の受け取りは？'],
    ['Wi-Fi', 'Wi-Fiのパスワードは？'],
    ['ゴミ出し', 'ゴミはどうすればいい？'],
    ['アクセス・地図', '最寄り駅からの行き方は？'],
  ]
  for (const [c, t] of starters) add(c, t)
}

// ── AI取り込み（貼り付け→抽出→確認→追加。取り込むのは事務案内=info）──
interface Candidate {
  category: string
  title: string
  body: string
  selected: boolean
}
const importOpen = ref(false)
const importText = ref('')
const extracting = ref(false)
const extractError = ref('')
const candidates = ref<Candidate[]>([])
const droppedList = ref<string[]>([])
const welcomeSuggestion = ref('')
const applyWelcome = ref(false)

const selectedCount = computed(() => candidates.value.filter((c) => c.selected).length)

function resetImport() {
  candidates.value = []
  droppedList.value = []
  welcomeSuggestion.value = ''
  applyWelcome.value = false
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
    const res = await $fetch<ExtractResult>('/api/guesthouse/extract', { method: 'POST', body: { text } })
    candidates.value = res.facts.map((f) => ({ ...f, selected: true }))
    droppedList.value = res.dropped
    welcomeSuggestion.value = res.welcome
    applyWelcome.value = !!res.welcome && !form.welcome.trim()
    if (!candidates.value.length && !welcomeSuggestion.value) {
      extractError.value = '取り込める事務案内が見つかりませんでした。文面をご確認ください。'
    }
  } catch (e: any) {
    extractError.value = e?.data?.message || '抽出に失敗しました。もう一度お試しください。'
  } finally {
    extracting.value = false
  }
}

function applyImport() {
  if (welcomeSuggestion.value && applyWelcome.value) form.welcome = welcomeSuggestion.value
  for (const c of candidates.value) {
    if (c.selected) form.facts.push({ _k: keySeq++, category: c.category, title: c.title, body: c.body, type: 'info' })
  }
  closeImport()
}
</script>

<style scoped>
.gh-label {
  display: block;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--gh-ink);
  margin-bottom: 0.3rem;
}
.gh-hint {
  font-size: 11.5px;
  color: var(--gh-ink-soft);
  margin-bottom: 0.5rem;
  line-height: 1.5;
}
</style>
