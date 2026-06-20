<template>
  <div class="flex flex-col items-center px-4 pt-4 lg:pt-8 pb-12 min-h-screen">
    <div class="relative w-full max-w-[680px]">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-emerald-500 to-teal-500 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-[10px]">

        <!-- Header -->
        <header class="text-center mb-6">
          <h1 class="m-0 text-[clamp(22px,4vw,28px)] font-bold bg-gradient-to-br from-emerald-400 to-teal-400 bg-clip-text text-transparent">節約</h1>
          <p class="mt-1 mb-0 text-slate-400 text-sm">買わない選択・使えるものを記録する</p>
        </header>

        <!-- Tabs -->
        <div class="flex gap-1 p-1 bg-white/[0.04] rounded-xl mb-6">
          <button
            @click="activeTab = 'gaman'"
            :class="activeTab === 'gaman' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'"
            class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
          >我慢ログ</button>
          <button
            @click="activeTab = 'fukkatsu'"
            :class="activeTab === 'fukkatsu' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200 border border-transparent'"
            class="flex-1 py-2 text-sm font-medium rounded-lg transition-all"
          >復活ログ</button>
        </div>

        <!-- ── Tab: 我慢ログ ── -->
        <div v-if="activeTab === 'gaman'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">品名</label>
                <input v-model="gamanForm.name" type="text" placeholder="例: マンガ全集"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">金額（円）</label>
                <input v-model.number="gamanForm.price" type="number" min="0" placeholder="0"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">買わなかった理由</label>
              <textarea v-model="gamanForm.reason" rows="2" placeholder="例: 読む時間がないから、電子書籍で十分だから"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">日付</label>
              <input v-model="gamanForm.date" type="date"
                class="bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">タグ</label>
              <div v-if="gamanForm.tags.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="tag in gamanForm.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  {{ tag }}
                  <button @click="removeGamanFormTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none ml-0.5">×</button>
                </span>
              </div>
              <input v-model="gamanTagInput" @keydown.enter.prevent="addGamanTag" type="text"
                placeholder="タグを入力してEnter（例: 本、家電）"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              <div v-if="gamanTagSuggestions.length" class="flex flex-wrap gap-1 mt-2">
                <button v-for="tag in gamanTagSuggestions" :key="tag" @click="addGamanTagDirect(tag)"
                  class="px-2 py-0.5 text-xs text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                  + {{ tag }}
                </button>
              </div>
            </div>
            <button @click="saveGaman" :disabled="!gamanForm.name.trim() || gamanSaving"
              class="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ gamanSaving ? '保存中...' : '記録する' }}
            </button>
          </div>

          <div class="border-t border-white/[0.06] mb-5" />

          <!-- AI Advice -->
          <div class="mb-5">
            <h3 class="text-sm font-semibold text-slate-300 mb-3">欲しいものを相談する</h3>
            <div class="space-y-3">
              <textarea v-model="wantsInput" rows="2" placeholder="欲しいもの・なぜ欲しいかを書いてください"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
              <div v-if="allTags.length">
                <p class="text-xs text-slate-400 mb-1.5">タグで絞り込む（未選択 = 全件参照）</p>
                <div class="flex flex-wrap gap-1.5">
                  <button v-for="tag in allTags" :key="tag" @click="toggleWantTag(tag)"
                    :class="wantTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                    class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                    {{ tag }}
                  </button>
                </div>
              </div>
              <button @click="getAdvice" :disabled="!wantsInput.trim() || isAdvising"
                class="w-full py-2 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                {{ isAdvising ? '考え中...' : 'アドバイスをもらう' }}
              </button>
              <div v-if="adviceResult"
                class="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
                {{ adviceResult }}
              </div>
              <p v-if="adviceError" class="text-xs text-red-400 m-0">{{ adviceError }}</p>
            </div>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- Records -->
          <div>
            <div v-if="allTags.length" class="mb-3">
              <p class="text-xs text-slate-500 mb-1.5">タグで絞り込む</p>
              <div class="flex flex-wrap gap-1">
                <button v-for="tag in allTags" :key="tag" @click="toggleGamanFilter(tag)"
                  :class="gamanFilterTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                  class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                  {{ tag }}
                </button>
              </div>
            </div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-slate-300 m-0">
                我慢ログ（{{ filteredGamanRecords.length }}件<template v-if="gamanFilterTags.length"> / {{ gamanRecords.length }}件中</template>）
              </h3>
              <span class="text-xs text-emerald-400 font-medium">合計 ¥{{ filteredGamanTotal.toLocaleString() }}</span>
            </div>
            <p v-if="gamanLoading" class="text-center py-6 text-slate-500 text-sm m-0">読み込み中...</p>
            <p v-else-if="!gamanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ記録がありません</p>
            <p v-else-if="!filteredGamanRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する記録がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredGamanRecords" :key="record.id"
                class="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span class="text-sm font-medium text-slate-100">{{ record.name }}</span>
                    <span class="text-xs text-emerald-400">¥{{ record.price.toLocaleString() }}</span>
                  </div>
                  <p class="text-xs text-slate-400 mb-1.5 leading-relaxed m-0">{{ record.reason }}</p>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span v-for="tag in record.tags" :key="tag"
                      class="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400/70 text-[10px] rounded-full border border-emerald-500/20">
                      {{ tag }}
                    </span>
                    <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                  </div>
                </div>
                <button @click="deleteGaman(record.id)"
                  class="text-slate-600 hover:text-red-400 text-sm transition-colors flex-shrink-0 mt-0.5 bg-transparent border-none cursor-pointer p-0">✕</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ── Tab: 復活ログ ── -->
        <div v-if="activeTab === 'fukkatsu'">

          <!-- Form -->
          <div class="space-y-3 mb-5">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-xs text-slate-400 mb-1 block">品名</label>
                <input v-model="fukkatsuForm.name" type="text" placeholder="例: ワイヤレスイヤホン"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label class="text-xs text-slate-400 mb-1 block">相当額（円）</label>
                <input v-model.number="fukkatsuForm.price" type="number" min="0" placeholder="0"
                  class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">再使用した理由</label>
              <textarea v-model="fukkatsuForm.reason" rows="2" placeholder="例: 新しいものを買わずに済んだ、まだ使えると気づいた"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">日付</label>
              <input v-model="fukkatsuForm.date" type="date"
                class="bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label class="text-xs text-slate-400 mb-1 block">タグ</label>
              <div v-if="fukkatsuForm.tags.length" class="flex flex-wrap gap-1.5 mb-2">
                <span v-for="tag in fukkatsuForm.tags" :key="tag"
                  class="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/15 text-emerald-400 text-xs rounded-full border border-emerald-500/30">
                  {{ tag }}
                  <button @click="removeFukkatsuFormTag(tag)" class="text-emerald-400/60 hover:text-emerald-300 leading-none ml-0.5">×</button>
                </span>
              </div>
              <input v-model="fukkatsuTagInput" @keydown.enter.prevent="addFukkatsuTag" type="text"
                placeholder="タグを入力してEnter（例: 家電、衣類）"
                class="w-full bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
              <div v-if="fukkatsuTagSuggestions.length" class="flex flex-wrap gap-1 mt-2">
                <button v-for="tag in fukkatsuTagSuggestions" :key="tag" @click="addFukkatsuTagDirect(tag)"
                  class="px-2 py-0.5 text-xs text-slate-400 border border-white/[0.08] rounded-full hover:border-emerald-500/30 hover:text-emerald-400 transition-colors">
                  + {{ tag }}
                </button>
              </div>
            </div>
            <button @click="saveFukkatsu" :disabled="!fukkatsuForm.name.trim() || fukkatsuSaving"
              class="w-full py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 text-sm font-medium rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {{ fukkatsuSaving ? '保存中...' : '記録する' }}
            </button>
          </div>

          <div class="border-t border-white/[0.06] mb-4" />

          <!-- Records -->
          <div>
            <div v-if="allTags.length" class="mb-3">
              <p class="text-xs text-slate-500 mb-1.5">タグで絞り込む</p>
              <div class="flex flex-wrap gap-1">
                <button v-for="tag in allTags" :key="tag" @click="toggleFukkatsuFilter(tag)"
                  :class="fukkatsuFilterTags.includes(tag) ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'text-slate-400 border-white/[0.12] hover:border-emerald-500/30 hover:text-emerald-400'"
                  class="px-2.5 py-0.5 text-xs rounded-full border transition-all">
                  {{ tag }}
                </button>
              </div>
            </div>
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold text-slate-300 m-0">
                復活ログ（{{ filteredFukkatsuRecords.length }}件<template v-if="fukkatsuFilterTags.length"> / {{ fukkatsuRecords.length }}件中</template>）
              </h3>
              <span class="text-xs text-emerald-400 font-medium">節約相当 ¥{{ filteredFukkatsuTotal.toLocaleString() }}</span>
            </div>
            <p v-if="fukkatsuLoading" class="text-center py-6 text-slate-500 text-sm m-0">読み込み中...</p>
            <p v-else-if="!fukkatsuRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">まだ記録がありません</p>
            <p v-else-if="!filteredFukkatsuRecords.length" class="text-center py-6 text-slate-500 text-sm m-0">該当する記録がありません</p>
            <div class="space-y-2">
              <div v-for="record in filteredFukkatsuRecords" :key="record.id"
                class="flex items-start gap-3 p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span class="text-sm font-medium text-slate-100">{{ record.name }}</span>
                    <span class="text-xs text-teal-400">¥{{ record.price.toLocaleString() }} 節約</span>
                  </div>
                  <p class="text-xs text-slate-400 mb-1.5 leading-relaxed m-0">{{ record.reason }}</p>
                  <div class="flex items-center gap-2 flex-wrap">
                    <span v-for="tag in record.tags" :key="tag"
                      class="px-1.5 py-0.5 bg-teal-500/10 text-teal-400/70 text-[10px] rounded-full border border-teal-500/20">
                      {{ tag }}
                    </span>
                    <span class="text-[10px] text-slate-500">{{ record.date }}</span>
                  </div>
                </div>
                <button @click="deleteFukkatsu(record.id)"
                  class="text-slate-600 hover:text-red-400 text-sm transition-colors flex-shrink-0 mt-0.5 bg-transparent border-none cursor-pointer p-0">✕</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface SetsuyakuRecord {
  id: string
  date: string
  name: string
  price: number
  reason: string
  tags: string[]
}

const today = () => new Date().toISOString().slice(0, 10)

const isDev = import.meta.dev

function lsGet(key: string): SetsuyakuRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]')
    return (parsed as SetsuyakuRecord[]).map(r => ({ ...r, tags: Array.isArray(r.tags) ? r.tags : [] }))
  } catch { return [] }
}
function lsSet(key: string, records: SetsuyakuRecord[]) {
  localStorage.setItem(key, JSON.stringify(records))
}

const activeTab = ref<'gaman' | 'fukkatsu'>('gaman')

// ── 我慢ログ ──
const gamanRecords = ref<SetsuyakuRecord[]>([])
const gamanLoading = ref(false)
const gamanSaving = ref(false)
const gamanForm = ref({ name: '', price: 0, reason: '', date: today(), tags: [] as string[] })
const gamanTagInput = ref('')

const allTags = computed(() => {
  const set = new Set<string>()
  gamanRecords.value.forEach(r => r.tags.forEach(t => set.add(t)))
  fukkatsuRecords.value.forEach(r => r.tags.forEach(t => set.add(t)))
  return [...set].sort()
})

const gamanTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !gamanForm.value.tags.includes(t))
  const q = gamanTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})

function addGamanTag() {
  const tag = gamanTagInput.value.trim()
  if (tag && !gamanForm.value.tags.includes(tag)) gamanForm.value.tags.push(tag)
  gamanTagInput.value = ''
}
function addGamanTagDirect(tag: string) {
  if (!gamanForm.value.tags.includes(tag)) gamanForm.value.tags.push(tag)
  gamanTagInput.value = ''
}
function removeGamanFormTag(tag: string) {
  gamanForm.value.tags = gamanForm.value.tags.filter(t => t !== tag)
}

async function fetchGaman() {
  gamanLoading.value = true
  try {
    if (isDev) {
      gamanRecords.value = lsGet('setsuyaku_gaman')
    } else {
      gamanRecords.value = await $fetch<SetsuyakuRecord[]>('/api/setsuyaku/gaman')
    }
  } catch {}
  gamanLoading.value = false
}

async function saveGaman() {
  if (!gamanForm.value.name.trim() || gamanSaving.value) return
  // 入力欄に未確定のタグがあれば自動で追加
  const pendingTag = gamanTagInput.value.trim()
  if (pendingTag && !gamanForm.value.tags.includes(pendingTag)) gamanForm.value.tags.push(pendingTag)
  gamanTagInput.value = ''
  gamanSaving.value = true
  try {
    const record: SetsuyakuRecord = {
      id: crypto.randomUUID(),
      date: gamanForm.value.date,
      name: gamanForm.value.name.trim(),
      price: gamanForm.value.price || 0,
      reason: gamanForm.value.reason.trim(),
      tags: [...gamanForm.value.tags],
    }
    if (isDev) {
      const stored = lsGet('setsuyaku_gaman')
      stored.unshift(record)
      lsSet('setsuyaku_gaman', stored)
      gamanRecords.value.unshift(record)
    } else {
      const saved = await $fetch<SetsuyakuRecord>('/api/setsuyaku/gaman', { method: 'POST', body: record })
      gamanRecords.value.unshift(saved)
    }
    gamanForm.value = { name: '', price: 0, reason: '', date: today(), tags: [] }
  } catch {}
  gamanSaving.value = false
}

async function deleteGaman(id: string) {
  if (!confirm('この記録を削除しますか？')) return
  if (isDev) {
    lsSet('setsuyaku_gaman', lsGet('setsuyaku_gaman').filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/gaman/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  gamanRecords.value = gamanRecords.value.filter(r => r.id !== id)
}

const totalGaman = computed(() => gamanRecords.value.reduce((s, r) => s + r.price, 0))

const gamanFilterTags = ref<string[]>([])
function toggleGamanFilter(tag: string) {
  const idx = gamanFilterTags.value.indexOf(tag)
  if (idx === -1) gamanFilterTags.value.push(tag)
  else gamanFilterTags.value.splice(idx, 1)
}
const filteredGamanRecords = computed(() => {
  if (!gamanFilterTags.value.length) return gamanRecords.value
  return gamanRecords.value.filter(r => r.tags.some(t => gamanFilterTags.value.includes(t)))
})
const filteredGamanTotal = computed(() => filteredGamanRecords.value.reduce((s, r) => s + r.price, 0))

// ── 復活ログ ──
const fukkatsuRecords = ref<SetsuyakuRecord[]>([])
const fukkatsuLoading = ref(false)
const fukkatsuSaving = ref(false)
const fukkatsuForm = ref({ name: '', price: 0, reason: '', date: today(), tags: [] as string[] })
const fukkatsuTagInput = ref('')

const fukkatsuTagSuggestions = computed(() => {
  const available = allTags.value.filter(t => !fukkatsuForm.value.tags.includes(t))
  const q = fukkatsuTagInput.value.trim()
  return q ? available.filter(t => t.includes(q)) : available
})

function addFukkatsuTag() {
  const tag = fukkatsuTagInput.value.trim()
  if (tag && !fukkatsuForm.value.tags.includes(tag)) fukkatsuForm.value.tags.push(tag)
  fukkatsuTagInput.value = ''
}
function addFukkatsuTagDirect(tag: string) {
  if (!fukkatsuForm.value.tags.includes(tag)) fukkatsuForm.value.tags.push(tag)
  fukkatsuTagInput.value = ''
}
function removeFukkatsuFormTag(tag: string) {
  fukkatsuForm.value.tags = fukkatsuForm.value.tags.filter(t => t !== tag)
}

async function fetchFukkatsu() {
  fukkatsuLoading.value = true
  try {
    if (isDev) {
      fukkatsuRecords.value = lsGet('setsuyaku_fukkatsu')
    } else {
      fukkatsuRecords.value = await $fetch<SetsuyakuRecord[]>('/api/setsuyaku/fukkatsu')
    }
  } catch {}
  fukkatsuLoading.value = false
}

async function saveFukkatsu() {
  if (!fukkatsuForm.value.name.trim() || fukkatsuSaving.value) return
  const pendingTag = fukkatsuTagInput.value.trim()
  if (pendingTag && !fukkatsuForm.value.tags.includes(pendingTag)) fukkatsuForm.value.tags.push(pendingTag)
  fukkatsuTagInput.value = ''
  fukkatsuSaving.value = true
  try {
    const record: SetsuyakuRecord = {
      id: crypto.randomUUID(),
      date: fukkatsuForm.value.date,
      name: fukkatsuForm.value.name.trim(),
      price: fukkatsuForm.value.price || 0,
      reason: fukkatsuForm.value.reason.trim(),
      tags: [...fukkatsuForm.value.tags],
    }
    if (isDev) {
      const stored = lsGet('setsuyaku_fukkatsu')
      stored.unshift(record)
      lsSet('setsuyaku_fukkatsu', stored)
      fukkatsuRecords.value.unshift(record)
    } else {
      const saved = await $fetch<SetsuyakuRecord>('/api/setsuyaku/fukkatsu', { method: 'POST', body: record })
      fukkatsuRecords.value.unshift(saved)
    }
    fukkatsuForm.value = { name: '', price: 0, reason: '', date: today(), tags: [] }
  } catch {}
  fukkatsuSaving.value = false
}

async function deleteFukkatsu(id: string) {
  if (!confirm('この記録を削除しますか？')) return
  if (isDev) {
    lsSet('setsuyaku_fukkatsu', lsGet('setsuyaku_fukkatsu').filter(r => r.id !== id))
  } else {
    await $fetch(`/api/setsuyaku/fukkatsu/${id}`, { method: 'DELETE' }).catch(() => {})
  }
  fukkatsuRecords.value = fukkatsuRecords.value.filter(r => r.id !== id)
}

const totalFukkatsu = computed(() => fukkatsuRecords.value.reduce((s, r) => s + r.price, 0))

const fukkatsuFilterTags = ref<string[]>([])
function toggleFukkatsuFilter(tag: string) {
  const idx = fukkatsuFilterTags.value.indexOf(tag)
  if (idx === -1) fukkatsuFilterTags.value.push(tag)
  else fukkatsuFilterTags.value.splice(idx, 1)
}
const filteredFukkatsuRecords = computed(() => {
  if (!fukkatsuFilterTags.value.length) return fukkatsuRecords.value
  return fukkatsuRecords.value.filter(r => r.tags.some(t => fukkatsuFilterTags.value.includes(t)))
})
const filteredFukkatsuTotal = computed(() => filteredFukkatsuRecords.value.reduce((s, r) => s + r.price, 0))

// ── AI アドバイス ──
const wantsInput = ref('')
const wantTags = ref<string[]>([])
const adviceResult = ref('')
const adviceError = ref('')
const isAdvising = ref(false)

function toggleWantTag(tag: string) {
  const idx = wantTags.value.indexOf(tag)
  if (idx === -1) wantTags.value.push(tag)
  else wantTags.value.splice(idx, 1)
}

async function getAdvice() {
  if (!wantsInput.value.trim() || isAdvising.value) return
  isAdvising.value = true
  adviceResult.value = ''
  adviceError.value = ''
  try {
    const filtered = wantTags.value.length
      ? gamanRecords.value.filter(r => r.tags.some(t => wantTags.value.includes(t)))
      : gamanRecords.value
    const res = await $fetch<{ result: string }>('/api/setsuyaku/advice', {
      method: 'POST',
      body: { wants: wantsInput.value.trim(), wantTags: wantTags.value, records: filtered },
    })
    adviceResult.value = res.result
  } catch (e) {
    adviceError.value = e instanceof Error ? e.message : 'アドバイスの取得に失敗しました'
  } finally {
    isAdvising.value = false
  }
}

onMounted(() => {
  fetchGaman()
  fetchFukkatsu()
})
</script>
