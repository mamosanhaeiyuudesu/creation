<template>
  <div class="max-w-[680px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <NuxtLink to="/guesthouse" class="text-[13px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]">← 宿一覧</NuxtLink>
      <button v-if="house" class="text-[12.5px] text-[var(--gh-ink-faint)] hover:text-[var(--gh-warn)]" @click="remove">この宿を削除</button>
    </div>

    <div v-if="loading" class="py-24 text-center text-[var(--gh-ink-soft)] text-[13px]">読み込み中…</div>
    <div v-else-if="!house" class="py-24 text-center text-[var(--gh-ink-soft)] text-[14px]">宿が見つかりませんでした。</div>

    <template v-else>
      <h1 class="gh-display text-[22px] font-bold mb-3">{{ house.name }}</h1>

      <!-- タブ -->
      <div class="flex gap-1.5 mb-5 flex-wrap">
        <button v-for="t in TABS" :key="t.key" class="gh-chip" :class="{ 'gh-chip--on': tab === t.key }" @click="switchTab(t.key)">{{ t.label }}</button>
      </div>

      <!-- 案内の編集 -->
      <template v-if="tab === 'edit'">
        <HouseForm v-model="form" />
        <div v-if="errorMsg" class="mt-4 text-[13px] text-[var(--gh-warn)]">{{ errorMsg }}</div>
        <div class="flex gap-2 mt-6 mb-8">
          <button class="gh-btn flex-1" :disabled="saving || !form.name.trim()" @click="save">
            {{ saving ? '保存中…' : saved ? '保存しました' : '保存する' }}
          </button>
        </div>
        <SharePanel :share-token="house.shareToken" />
      </template>

      <!-- 会話ログ -->
      <template v-else-if="tab === 'sessions'">
        <div v-if="sub.loading" class="text-center text-[var(--gh-ink-soft)] py-10 text-[13px]">読み込み中…</div>
        <p v-else-if="!sessions.length" class="text-center text-[var(--gh-ink-soft)] py-12 text-[14px]">まだお客様との会話はありません。</p>
        <ul v-else class="space-y-2">
          <li v-for="s in sessions" :key="s.id">
            <NuxtLink :to="`/guesthouse/session/${s.id}`" class="block rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] px-4 py-3 transition hover:border-[var(--gh-forest-soft)]">
              <div class="flex items-center gap-2">
                <p class="font-bold text-[14.5px] truncate">{{ s.guestName || '名前未設定のお客様' }}</p>
                <span v-if="s.pendingConsults" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-warn)] !border-[color-mix(in_srgb,var(--gh-warn)_40%,transparent)]">相談 {{ s.pendingConsults }}</span>
                <span v-if="s.hasDiary" class="gh-chip !py-0.5 !px-2 !text-[10.5px]">日記あり</span>
                <span class="ml-auto text-[11px] text-[var(--gh-ink-faint)]">{{ s.messageCount }}件 ・ {{ formatDate(s.updatedAt) }}</span>
              </div>
            </NuxtLink>
          </li>
        </ul>
      </template>

      <!-- お客さん日記 -->
      <template v-else-if="tab === 'diaries'">
        <div v-if="sub.loading" class="text-center text-[var(--gh-ink-soft)] py-10 text-[13px]">読み込み中…</div>
        <p v-else-if="!diaries.length" class="text-center text-[var(--gh-ink-soft)] py-12 text-[14px]">まだ日記はありません。会話から作れます。</p>
        <ul v-else class="space-y-2.5">
          <li v-for="d in diaries" :key="d.id" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
            <div class="flex items-center gap-2 mb-1.5">
              <p class="font-bold text-[14.5px]">{{ d.guestName || '匿名のお客様' }}</p>
              <NuxtLink :to="`/guesthouse/session/${d.sessionId}`" class="ml-auto text-[12px] text-[var(--gh-forest-deep)] underline underline-offset-2">会話・編集</NuxtLink>
            </div>
            <p v-if="d.summary" class="text-[13px] text-[var(--gh-ink)] mb-2">{{ d.summary }}</p>
            <dl class="text-[12.5px] text-[var(--gh-ink-soft)] space-y-0.5">
              <div v-if="d.content.nationality"><span class="font-bold">国籍：</span>{{ d.content.nationality }}</div>
              <div v-if="d.content.itinerary"><span class="font-bold">旅程：</span>{{ d.content.itinerary }}</div>
              <div v-if="d.content.highlights"><span class="font-bold">印象：</span>{{ d.content.highlights }}</div>
              <div v-if="d.content.notes"><span class="font-bold">気づき：</span>{{ d.content.notes }}</div>
            </dl>
          </li>
        </ul>
      </template>

      <!-- 傾向 -->
      <template v-else-if="tab === 'trends'">
        <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
          お客さん日記から、次の一手に活きる傾向をAIが見つけます（日記が2件以上で有効）。
        </p>
        <button class="gh-btn-ghost !h-10 mb-4" :disabled="sub.loading" @click="loadTrends">
          {{ sub.loading ? '分析中…' : trends ? '再分析する' : '傾向を分析する' }}
        </button>
        <p v-if="trends && !trends.items.length" class="text-center text-[var(--gh-ink-soft)] py-8 text-[13px]">
          傾向を出すにはもう少し日記が必要です（現在 {{ trends.basedOn }} 件）。
        </p>
        <ul v-else-if="trends" class="space-y-2.5">
          <li v-for="(t, i) in trends.items" :key="i" class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
            <p class="gh-display font-bold text-[14.5px] text-[var(--gh-forest-deep)] mb-1">{{ t.title }}</p>
            <p class="text-[13px] leading-relaxed">{{ t.detail }}</p>
          </li>
        </ul>
        <p v-if="subError" class="text-[12.5px] text-[var(--gh-warn)] mt-2">{{ subError }}</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import HouseForm from '~/components/guesthouse/HouseForm.vue'
import SharePanel from '~/components/guesthouse/SharePanel.vue'
import type { Diary, House, HouseInput, SessionSummary, Trends } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })

const route = useRoute()
const id = route.params.id as string

type Tab = 'edit' | 'sessions' | 'diaries' | 'trends'
const TABS: { key: Tab; label: string }[] = [
  { key: 'edit', label: '案内の編集' },
  { key: 'sessions', label: '会話ログ' },
  { key: 'diaries', label: 'お客さん日記' },
  { key: 'trends', label: '傾向' },
]
const tab = ref<Tab>('edit')

const house = ref<House | null>(null)
const form = ref<HouseInput>({ name: '', welcome: '', facts: [] })
const loading = ref(true)
const saving = ref(false)
const saved = ref(false)
const errorMsg = ref('')

const sessions = ref<SessionSummary[]>([])
const diaries = ref<Diary[]>([])
const trends = ref<Trends | null>(null)
const sub = reactive({ loading: false })
const subError = ref('')

useHead(() => ({ title: `${house.value?.name ?? '宿'} | ゲストハウス案内` }))

async function load() {
  loading.value = true
  try {
    const h = await $fetch<House>(`/api/guesthouse/houses/${id}`)
    house.value = h
    form.value = {
      name: h.name,
      welcome: h.welcome,
      facts: h.facts.map((f) => ({ category: f.category, title: f.title, body: f.body, type: f.type })),
    }
  } catch {
    house.value = null
  } finally {
    loading.value = false
  }
}

async function switchTab(t: Tab) {
  tab.value = t
  subError.value = ''
  if (t === 'sessions') {
    sub.loading = true
    try { sessions.value = await $fetch<SessionSummary[]>(`/api/guesthouse/houses/${id}/sessions`) } catch { /* noop */ } finally { sub.loading = false }
  } else if (t === 'diaries') {
    sub.loading = true
    try { diaries.value = await $fetch<Diary[]>(`/api/guesthouse/houses/${id}/diaries`) } catch { /* noop */ } finally { sub.loading = false }
  }
}

async function loadTrends() {
  sub.loading = true
  subError.value = ''
  try {
    trends.value = await $fetch<Trends>(`/api/guesthouse/houses/${id}/trends`)
  } catch (e: any) {
    subError.value = e?.data?.message || '分析に失敗しました。'
  } finally {
    sub.loading = false
  }
}

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

async function save() {
  if (!form.value.name.trim()) return
  saving.value = true
  saved.value = false
  errorMsg.value = ''
  try {
    const h = await $fetch<House>(`/api/guesthouse/houses/${id}`, { method: 'PUT', body: form.value })
    house.value = h
    saved.value = true
    setTimeout(() => (saved.value = false), 2000)
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!confirm('この宿と案内情報を削除します。よろしいですか？')) return
  try {
    await $fetch(`/api/guesthouse/houses/${id}`, { method: 'DELETE' })
    await navigateTo('/guesthouse')
  } catch (e: any) {
    errorMsg.value = e?.data?.message || '削除に失敗しました。'
  }
}

onMounted(load)
</script>
