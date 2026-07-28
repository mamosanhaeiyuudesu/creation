<template>
  <div class="max-w-[720px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <Breadcrumb
      class="mb-3"
      :items="[{ label: '管理トップ', to: '/guesthouse' }, { label: 'チャット一覧', to: '/guesthouse/sessions' }, { label: detail?.guestName || '会話' }]"
    />

    <div v-if="loading" class="py-24 text-center text-[var(--gh-ink-soft)] text-[13px]">読み込み中…</div>
    <div v-else-if="!detail" class="py-24 text-center text-[var(--gh-ink-soft)] text-[14px]">会話が見つかりませんでした。</div>

    <template v-else>
      <header class="mb-4 flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-[11px] text-[var(--gh-ink-faint)] mb-0.5">{{ detail.houseName }}</p>
          <h1 class="gh-display text-[21px] font-bold flex items-center gap-2 flex-wrap">
            {{ detail.guestName || '名前未設定のお客様' }}
            <span v-if="detail.status === 'closed'" class="gh-chip !py-0.5 !px-2 !text-[10.5px] !text-[var(--gh-ink-faint)]">クローズ済み</span>
          </h1>
        </div>
        <button class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] shrink-0" :disabled="statusBusy" @click="toggleStatus">
          {{ statusBusy ? '…' : detail.status === 'closed' ? '再開する' : 'クローズする' }}
        </button>
      </header>

      <!-- 会話ログ -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 mb-4">
        <p class="text-[12px] font-bold text-[var(--gh-ink-soft)] mb-3">会話ログ</p>
        <div class="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
          <div v-for="m in detail.messages" :key="m.id">
            <div v-if="m.role === 'guest'" class="flex justify-end">
              <div class="inline-block rounded-2xl rounded-tr-md bg-[var(--gh-forest)] text-white px-3.5 py-2 max-w-[85%]">
                <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
              </div>
            </div>
            <div v-else>
              <div class="inline-block rounded-2xl rounded-tl-md border px-3.5 py-2 max-w-[85%]"
                :class="m.role === 'host' ? 'bg-[#eef3e9] border-[var(--gh-forest-soft)]' : m.kind === 'handoff' ? 'bg-[#fbf3e4] border-[color-mix(in_srgb,var(--gh-warn)_35%,transparent)]' : 'bg-white border-[var(--gh-line)]'">
                <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
              </div>
              <p class="text-[10px] font-bold mt-0.5 pl-1"
                :class="m.role === 'host' ? 'text-[var(--gh-forest)]' : m.kind === 'handoff' ? 'text-[var(--gh-warn)]' : 'text-[var(--gh-forest-deep)]'">
                {{ m.role === 'host' ? '阪中さん' : m.kind === 'handoff' ? '阪中さんに確認' : '自動応答' }}
              </p>
            </div>
          </div>
          <p v-if="!detail.messages.length" class="text-[13px] text-[var(--gh-ink-soft)] text-center py-6">まだ会話がありません。</p>
        </div>
      </section>

      <!-- お客さん日記 -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="gh-display text-[15px] font-bold">お客さん日記</p>
          <button class="gh-btn-ghost !h-9" :disabled="diaryBusy || !detail.messages.length" @click="genDiary">
            {{ diaryBusy ? '作成中…' : diary ? 'AIで作り直す' : 'AIで日記を作る' }}
          </button>
        </div>

        <div v-if="diary" class="space-y-2.5">
          <div><label class="gh-dlabel">ひとこと要約</label><input v-model="diary.summary" class="gh-input text-[13.5px]" /></div>
          <div class="grid sm:grid-cols-2 gap-2.5">
            <div><label class="gh-dlabel">国籍・出身</label><input v-model="diary.content.nationality" class="gh-input text-[13.5px]" /></div>
            <div><label class="gh-dlabel">旅程</label><input v-model="diary.content.itinerary" class="gh-input text-[13.5px]" /></div>
          </div>
          <div><label class="gh-dlabel">印象的だったこと</label><textarea v-model="diary.content.highlights" rows="2" class="gh-input text-[13.5px]" /></div>
          <div><label class="gh-dlabel">気づき・次への活かし方</label><textarea v-model="diary.content.notes" rows="2" class="gh-input text-[13.5px]" /></div>
          <div v-if="diaryError" class="text-[12.5px] text-[var(--gh-warn)]">{{ diaryError }}</div>
          <div class="flex justify-end">
            <button class="gh-btn" :disabled="diaryBusy" @click="saveDiary">{{ savedDiary ? '保存しました' : '日記を保存' }}</button>
          </div>
        </div>
        <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">滞在の会話から、旅程・国籍・印象・気づきを整理した日記を作れます。</p>
      </section>

      <!-- お礼＆レビュー依頼 -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4">
        <div class="flex items-center justify-between mb-2">
          <p class="gh-display text-[15px] font-bold">お礼＆レビュー依頼</p>
          <button class="gh-btn-ghost !h-9" :disabled="fwBusy || !detail.messages.length" @click="genFarewell">
            {{ fwBusy ? '作成中…' : farewell ? '作り直す' : '下書きを作る' }}
          </button>
        </div>

        <div v-if="farewell" class="space-y-3">
          <div>
            <label class="gh-dlabel">お礼メッセージ（チャットに送れます）</label>
            <textarea v-model="farewell.thanks" rows="4" class="gh-input text-[13.5px]" />
            <div class="flex justify-end mt-1.5">
              <button class="gh-btn-ghost !h-9" :disabled="fwBusy || !farewell.thanks.trim()" @click="sendThanks">
                {{ sentThanks ? '送信しました' : 'このお礼をチャットに送る' }}
              </button>
            </div>
          </div>
          <div>
            <label class="gh-dlabel">レビュー依頼文（予約サイトに貼るコピー用）</label>
            <textarea v-model="farewell.reviewRequest" rows="4" class="gh-input text-[13.5px]" />
            <div class="flex justify-end mt-1.5">
              <button class="gh-btn-ghost !h-9" @click="copyReview">{{ copiedReview ? 'コピー済' : 'コピー' }}</button>
            </div>
          </div>
          <div v-if="fwError" class="text-[12.5px] text-[var(--gh-warn)]">{{ fwError }}</div>
        </div>
        <p v-else class="text-[12.5px] text-[var(--gh-ink-soft)]">
          宿泊後のお礼と、予約サイト用のレビュー依頼文をAIが下書きします。お礼はチャットへ、レビュー依頼はコピーして予約サイトに貼れます。
        </p>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import type { Diary, DiaryContent, FarewellDraft, SessionDetail } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })

const route = useRoute()
const id = route.params.id as string

const detail = ref<SessionDetail | null>(null)
const loading = ref(true)
const statusBusy = ref(false)

// 日記
const diary = ref<{ summary: string; content: DiaryContent } | null>(null)
const diaryBusy = ref(false)
const savedDiary = ref(false)
const diaryError = ref('')

// お礼・レビュー
const farewell = ref<FarewellDraft | null>(null)
const fwBusy = ref(false)
const fwError = ref('')
const sentThanks = ref(false)
const copiedReview = ref(false)

useHead(() => ({ title: `${detail.value?.guestName || '会話'} | ゲストハウス案内` }))

async function load() {
  loading.value = true
  try {
    const d = await $fetch<SessionDetail>(`/api/guesthouse/sessions/${id}`)
    detail.value = d
    if (d.diary) diary.value = { summary: d.diary.summary, content: { ...d.diary.content } }
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function toggleStatus() {
  if (!detail.value) return
  statusBusy.value = true
  try {
    const next = detail.value.status === 'closed' ? 'active' : 'closed'
    await $fetch(`/api/guesthouse/sessions/${id}/status`, { method: 'POST', body: { status: next } })
    detail.value = { ...detail.value, status: next }
  } catch {
    /* noop */
  } finally {
    statusBusy.value = false
  }
}

async function genDiary() {
  diaryBusy.value = true
  diaryError.value = ''
  try {
    const res = await $fetch<{ content: DiaryContent; summary: string }>(`/api/guesthouse/sessions/${id}/diary`, { method: 'POST' })
    diary.value = { summary: res.summary, content: res.content }
  } catch (e: any) {
    diaryError.value = e?.data?.message || '作成に失敗しました。'
  } finally {
    diaryBusy.value = false
  }
}

async function saveDiary() {
  if (!diary.value) return
  diaryBusy.value = true
  diaryError.value = ''
  try {
    const saved = await $fetch<Diary>('/api/guesthouse/diaries', {
      method: 'POST',
      body: { sessionId: id, content: diary.value.content, summary: diary.value.summary },
    })
    diary.value = { summary: saved.summary, content: { ...saved.content } }
    savedDiary.value = true
    setTimeout(() => (savedDiary.value = false), 2000)
  } catch (e: any) {
    diaryError.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    diaryBusy.value = false
  }
}

async function genFarewell() {
  fwBusy.value = true
  fwError.value = ''
  try {
    farewell.value = await $fetch<FarewellDraft>(`/api/guesthouse/sessions/${id}/farewell`, { method: 'POST' })
  } catch (e: any) {
    fwError.value = e?.data?.message || '作成に失敗しました。'
  } finally {
    fwBusy.value = false
  }
}

async function sendThanks() {
  if (!farewell.value?.thanks.trim()) return
  fwBusy.value = true
  fwError.value = ''
  try {
    await $fetch(`/api/guesthouse/sessions/${id}/post`, { method: 'POST', body: { content: farewell.value.thanks } })
    sentThanks.value = true
    setTimeout(() => (sentThanks.value = false), 2500)
    await load()
  } catch (e: any) {
    fwError.value = e?.data?.message || '送信に失敗しました。'
  } finally {
    fwBusy.value = false
  }
}

async function copyReview() {
  if (!farewell.value) return
  try {
    await navigator.clipboard.writeText(farewell.value.reviewRequest)
    copiedReview.value = true
    setTimeout(() => (copiedReview.value = false), 1600)
  } catch {
    /* コピー不可環境は無視 */
  }
}

onMounted(load)
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
