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
        <button class="gh-btn-ghost !h-9 !px-3.5 text-[12.5px] inline-flex items-center shrink-0" :disabled="statusBusy" @click="toggleStatus">
          {{ statusBusy ? '…' : detail.status === 'closed' ? '再開する' : 'クローズする' }}
        </button>
      </header>

      <!-- お客様チャットへの導線（別タブで開く・リンク/QR） -->
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
        <a
          :href="`/guesthouse/stay/${id}`"
          target="_blank"
          rel="noopener"
          class="text-[12.5px] text-[var(--gh-forest-deep)] hover:underline underline-offset-2 inline-flex items-center gap-1"
        >お客様チャットを別タブで開く ↗</a>
        <button class="text-[12.5px] text-[var(--gh-ink-soft)] hover:text-[var(--gh-ink)]" @click="showShare = !showShare">
          {{ showShare ? 'リンク・QRを隠す' : 'リンク・QRを表示' }}
        </button>
      </div>
      <div v-if="showShare" class="mb-4">
        <SharePanel :token="id" />
      </div>

      <!-- 会話ログ -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 mb-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-[12px] font-bold text-[var(--gh-ink-soft)]">会話ログ</p>
          <button class="text-[12px] text-[var(--gh-forest-deep)] hover:underline underline-offset-2" @click="openImport">
            Booking.comの履歴を取り込む
          </button>
        </div>
        <div class="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
          <div v-for="m in detail.messages" :key="m.id">
            <div v-if="m.role === 'guest'" class="flex flex-col items-end">
              <div class="inline-block rounded-2xl rounded-tr-md bg-[var(--gh-forest)] text-white px-3.5 py-2 max-w-[85%]">
                <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
              </div>
              <p class="text-[10px] font-bold mt-0.5 pr-1 text-[var(--gh-forest)]">
                {{ `${detail.guestName ? detail.guestName + 'さん' : 'お客様'}（${formatDateTime(m.createdAt)}）` }}
              </p>
            </div>
            <div v-else>
              <div class="inline-block rounded-2xl rounded-tl-md border px-3.5 py-2 max-w-[85%]"
                :class="m.role === 'host' ? 'bg-[#eef3e9] border-[var(--gh-forest-soft)]' : m.kind === 'handoff' ? 'bg-[#fbf3e4] border-[color-mix(in_srgb,var(--gh-warn)_35%,transparent)]' : 'bg-white border-[var(--gh-line)]'">
                <p class="text-[13.5px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
              </div>
              <p class="text-[10px] font-bold mt-0.5 pl-1"
                :class="m.role === 'host' ? 'text-[var(--gh-forest)]' : m.kind === 'handoff' ? 'text-[var(--gh-warn)]' : 'text-[var(--gh-forest-deep)]'">
                {{ (m.role === 'host' ? '阪中さん' : m.kind === 'handoff' ? '阪中さんに確認' : '自動応答') + `（${formatDateTime(m.createdAt)}）` }}
              </p>
            </div>
          </div>
          <p v-if="!detail.messages.length" class="text-[13px] text-[var(--gh-ink-soft)] text-center py-6">まだ会話がありません。</p>
        </div>

        <!-- 阪中さんから直接メッセージを送る -->
        <div class="mt-4 pt-4 border-t border-[var(--gh-line)]">
          <label class="gh-dlabel">お客様に直接メッセージを送る</label>
          <p class="text-[11.5px] text-[var(--gh-ink-faint)] mb-2 leading-relaxed">
            ここで送ると「阪中さん」名義でお客様のチャットに届きます（お客様の画面に自動で表示されます）。
          </p>
          <textarea
            v-model="directMsg"
            rows="3"
            class="gh-input text-[13.5px]"
            placeholder="例）本日は到着予定より少し早めでも大丈夫ですよ。お気をつけてお越しください。"
            @keydown.enter="onDirectEnter"
          />
          <div v-if="directError" class="text-[12.5px] text-[var(--gh-warn)] mt-1">{{ directError }}</div>
          <div class="flex justify-end mt-1.5">
            <button class="gh-btn" :disabled="directBusy || !directMsg.trim()" @click="sendDirect">
              {{ directBusy ? '送信中…' : directSent ? '送信しました' : 'メッセージを送る' }}
            </button>
          </div>
        </div>
      </section>

      <!-- 聞き取りメモ -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 mb-4">
        <p class="gh-display text-[15px] font-bold mb-2">聞き取りメモ</p>
        <p class="text-[12.5px] text-[var(--gh-ink-soft)] mb-2.5">対面などで直接聞いた内容を書き留めておけます。何件でも追加できます。</p>

        <textarea
          v-model="newNote"
          rows="3"
          class="gh-input text-[13.5px]"
          placeholder="例）明日は高野山に行くと言っていた。犬を飼っているそう。"
        />
        <div v-if="noteError" class="text-[12.5px] text-[var(--gh-warn)] mt-1">{{ noteError }}</div>
        <div class="flex justify-end mt-1.5">
          <button class="gh-btn" :disabled="noteBusy || !newNote.trim()" @click="addNote">
            {{ noteBusy ? '追加中…' : 'メモを追加' }}
          </button>
        </div>

        <ul v-if="detail.hearingNotes.length" class="space-y-2 mt-3 pt-3 border-t border-[var(--gh-line)]">
          <li v-for="n in detail.hearingNotes" :key="n.id" class="rounded-xl bg-white/40 border border-[var(--gh-line)] p-2.5">
            <template v-if="editingNoteId === n.id">
              <textarea v-model="editingNoteContent" rows="3" class="gh-input text-[13px]" />
              <div class="flex justify-end gap-2 mt-1.5">
                <button class="gh-btn-ghost !h-8 !px-3 text-[12px]" :disabled="noteBusy" @click="cancelEditNote">キャンセル</button>
                <button class="gh-btn !h-8 !px-3 text-[12px]" :disabled="noteBusy || !editingNoteContent.trim()" @click="saveEditNote(n.id)">
                  {{ noteBusy ? '保存中…' : '保存' }}
                </button>
              </div>
            </template>
            <template v-else>
              <p class="text-[13px] whitespace-pre-wrap leading-relaxed">{{ n.content }}</p>
              <div class="flex items-center justify-between mt-1">
                <p class="text-[10.5px] text-[var(--gh-ink-faint)]">{{ formatDate(n.createdAt) }}</p>
                <div class="flex items-center gap-3">
                  <button class="text-[11.5px] text-[var(--gh-forest-deep)] hover:underline underline-offset-2" @click="startEditNote(n)">編集</button>
                  <button class="text-[11.5px] text-[var(--gh-ink-faint)] hover:text-[var(--gh-warn)]" @click="removeNote(n.id)">削除</button>
                </div>
              </div>
            </template>
          </li>
        </ul>
      </section>

      <!-- お客さん日記 -->
      <section class="rounded-2xl border border-[var(--gh-line)] bg-[var(--gh-card)] p-4 mb-4">
        <div class="flex items-center justify-between mb-2">
          <p class="gh-display text-[15px] font-bold">お客さん日記</p>
          <button class="gh-btn-ghost !h-9" :disabled="diaryBusy || (!detail.messages.length && !detail.hearingNotes.length)" @click="genDiary">
            {{ diaryBusy ? '作成中…' : hasDiaryContent ? 'AIで作り直す' : 'AIで日記を作る' }}
          </button>
        </div>
        <p class="text-[12.5px] text-[var(--gh-ink-soft)] mb-2.5">自分で書くか、滞在の会話・聞き取りメモからAIに旅程・国籍・印象・気づきを整理させることができます。</p>

        <div class="space-y-2.5">
          <div class="grid sm:grid-cols-2 gap-2.5">
            <div><label class="gh-dlabel">国籍・出身</label><input v-model="diary.nationality" class="gh-input text-[13.5px]" /></div>
            <div><label class="gh-dlabel">旅程</label><input v-model="diary.itinerary" class="gh-input text-[13.5px]" /></div>
          </div>
          <div><label class="gh-dlabel">印象的だったこと</label><textarea v-model="diary.highlights" rows="2" class="gh-input text-[13.5px]" /></div>
          <div><label class="gh-dlabel">気づき・次への活かし方</label><textarea v-model="diary.notes" rows="2" class="gh-input text-[13.5px]" /></div>
          <div v-if="diaryError" class="text-[12.5px] text-[var(--gh-warn)]">{{ diaryError }}</div>
          <div class="flex justify-end">
            <button class="gh-btn" :disabled="diaryBusy" @click="saveDiary">{{ savedDiary ? '保存しました' : '日記を保存' }}</button>
          </div>
        </div>
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

      <!-- 会話の削除 -->
      <div class="mt-8 text-center">
        <button class="text-[12.5px] text-[var(--gh-ink-faint)] hover:text-[var(--gh-warn)]" @click="showDelete = true">この会話を削除</button>
      </div>
    </template>

    <!-- 削除確認ポップアップ -->
    <div v-if="showDelete" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[200]" @click.self="showDelete = false">
      <div class="w-full max-w-[400px] bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <p class="gh-display font-bold text-[16px] mb-1">この会話を削除しますか？</p>
        <p class="text-[12.5px] text-[var(--gh-ink-soft)] leading-relaxed mb-4">
          会話ログ・お客さん日記・聞き取りメモ・関連する相談がすべて削除されます。この操作は取り消せません。
        </p>
        <p v-if="deleteError" class="text-[12.5px] text-[var(--gh-warn)] mb-2">{{ deleteError }}</p>
        <div class="flex gap-2">
          <button class="gh-btn-ghost flex-1" :disabled="deleting" @click="showDelete = false">キャンセル</button>
          <button class="gh-btn flex-1 !bg-[var(--gh-warn)]" :disabled="deleting" @click="confirmDelete">
            {{ deleting ? '削除中…' : '削除する' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Booking.com取り込みポップアップ -->
    <div v-if="importOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 z-[200]" @click.self="closeImport">
      <div class="w-full max-w-[560px] max-h-[88vh] overflow-y-auto bg-[var(--gh-card)] rounded-2xl p-5 gh-rise">
        <h2 class="gh-display font-bold text-[17px] mb-1">Booking.comの履歴を取り込む</h2>
        <p class="text-[12px] text-[var(--gh-ink-soft)] leading-relaxed mb-3">
          Booking.comのメッセージ画面からコピーした内容を貼り付けると、メッセージを機械的に分割し、AIがゲスト/ホストを振り分けます。取り込むと現在の会話の続きとして追加されます。保存前に発言者をご確認・修正いただけます。
        </p>

        <template v-if="!importCandidates.length">
          <textarea v-model="importText" rows="10" class="gh-input text-[12.5px]" placeholder="ここにBooking.comのメッセージ履歴を貼り付け…" />
          <p v-if="importError" class="text-[12.5px] text-[var(--gh-warn)] mt-2">{{ importError }}</p>
          <div class="flex gap-2 mt-4">
            <button class="gh-btn-ghost flex-1" @click="closeImport">キャンセル</button>
            <button class="gh-btn flex-1" :disabled="importing || !importText.trim()" @click="runImportPreview">
              {{ importing ? '解析中…' : 'AIで解析する' }}
            </button>
          </div>
        </template>

        <template v-else>
          <p class="text-[12px] font-bold mb-1.5">{{ importCandidates.length }}件のメッセージを検出しました。発言者を確認してください。</p>
          <ul class="space-y-2 mb-3">
            <li v-for="(c, i) in importCandidates" :key="i" class="rounded-xl border border-[var(--gh-line)] bg-[var(--gh-paper)] p-3">
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[10.5px] text-[var(--gh-ink-faint)]">{{ formatDateTime(c.createdAt) }}</span>
                <button
                  class="gh-chip gh-chip--on !py-0.5 !px-2 !text-[10.5px]"
                  @click="c.role = c.role === 'guest' ? 'host' : 'guest'"
                >
                  {{ c.role === 'guest' ? 'ゲスト' : 'ホスト' }}
                </button>
              </div>
              <p class="text-[12.5px] leading-relaxed whitespace-pre-wrap">{{ c.content }}</p>
            </li>
          </ul>
          <p v-if="importError" class="text-[12.5px] text-[var(--gh-warn)] mt-1">{{ importError }}</p>
          <div class="flex gap-2 mt-2">
            <button class="gh-btn-ghost flex-1" :disabled="savingImport" @click="importCandidates = []">戻る</button>
            <button class="gh-btn flex-1" :disabled="savingImport" @click="confirmImport">
              {{ savingImport ? '取り込み中…' : `${importCandidates.length}件を取り込む` }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import Breadcrumb from '~/components/guesthouse/Breadcrumb.vue'
import SharePanel from '~/components/guesthouse/SharePanel.vue'
import type { Diary, DiaryContent, FarewellDraft, HearingNote, ImportedMessage, SessionDetail } from '~/types/guesthouse'

definePageMeta({ layout: 'guesthouse' })

const route = useRoute()
const id = route.params.id as string

const detail = ref<SessionDetail | null>(null)
const loading = ref(true)
const statusBusy = ref(false)
const showShare = ref(false)
const showDelete = ref(false)
const deleting = ref(false)
const deleteError = ref('')

// お客様への直接メッセージ
const directMsg = ref('')
const directBusy = ref(false)
const directError = ref('')
const directSent = ref(false)

// Booking.comの履歴取り込み（コピペ原文→機械的に分割→AIで発言者を分類→確認して保存）
const importOpen = ref(false)
const importText = ref('')
const importing = ref(false)
const importError = ref('')
const importCandidates = ref<ImportedMessage[]>([])
const savingImport = ref(false)

// 聞き取りメモ（対面などで直接聞いた内容。自由記述・1セッションに複数可）
const newNote = ref('')
const noteBusy = ref(false)
const noteError = ref('')
const editingNoteId = ref<string | null>(null)
const editingNoteContent = ref('')

// 日記（自分で手入力もできるよう、生成前から空の状態で用意しておく）
const diary = ref<DiaryContent>({ nationality: '', itinerary: '', highlights: '', notes: '' })
const diaryBusy = ref(false)
const savedDiary = ref(false)
const diaryError = ref('')
const hasDiaryContent = computed(() => {
  const c = diary.value
  return !!(c.nationality.trim() || c.itinerary.trim() || c.highlights.trim() || c.notes.trim())
})

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
    if (d.diary) diary.value = { ...d.diary.content }
  } catch {
    detail.value = null
  } finally {
    loading.value = false
  }
}

async function confirmDelete() {
  deleting.value = true
  deleteError.value = ''
  try {
    await $fetch(`/api/guesthouse/sessions/${id}`, { method: 'DELETE' })
    await navigateTo('/guesthouse/sessions')
  } catch (e: any) {
    deleteError.value = e?.data?.message || '削除に失敗しました。'
    deleting.value = false
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

// Enter送信（IME変換中・修飾キー併用は改行）。お客様チャット入力欄と同じ挙動。
function onDirectEnter(e: KeyboardEvent) {
  if (e.isComposing || (e as any).keyCode === 229) return
  if (e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return
  e.preventDefault()
  sendDirect()
}

// 阪中さんから会話スレッドに直接メッセージを投稿する（相談承認とは別の任意メッセージ）。
async function sendDirect() {
  const content = directMsg.value.trim()
  if (!content || directBusy.value) return
  directBusy.value = true
  directError.value = ''
  try {
    await $fetch(`/api/guesthouse/sessions/${id}/post`, { method: 'POST', body: { content } })
    directMsg.value = ''
    directSent.value = true
    setTimeout(() => (directSent.value = false), 2500)
    await load()
  } catch (e: any) {
    directError.value = e?.data?.message || '送信に失敗しました。'
  } finally {
    directBusy.value = false
  }
}

function openImport() {
  importText.value = ''
  importCandidates.value = []
  importError.value = ''
  importOpen.value = true
}

function closeImport() {
  importOpen.value = false
}

// 貼り付けた原文を機械的に分割し、AIで発言者(ゲスト/阪中さん)を分類する（保存はまだしない・確認用）。
async function runImportPreview() {
  if (!importText.value.trim() || importing.value) return
  importing.value = true
  importError.value = ''
  try {
    const res = await $fetch<{ items: ImportedMessage[] }>(`/api/guesthouse/sessions/${id}/import-preview`, {
      method: 'POST',
      body: { text: importText.value },
    })
    importCandidates.value = res.items
  } catch (e: any) {
    importError.value = e?.data?.message || '解析に失敗しました。'
  } finally {
    importing.value = false
  }
}

// 確認・修正した内容を、会話の続きとして確定保存する。
async function confirmImport() {
  if (!importCandidates.value.length || savingImport.value) return
  savingImport.value = true
  importError.value = ''
  try {
    await $fetch(`/api/guesthouse/sessions/${id}/import`, { method: 'POST', body: { items: importCandidates.value } })
    importOpen.value = false
    await load()
  } catch (e: any) {
    importError.value = e?.data?.message || '取り込みに失敗しました。'
  } finally {
    savingImport.value = false
  }
}

// 聞き取りメモを1件追加する（対面などで直接聞いた内容。何件でも追加できる）。
async function addNote() {
  const content = newNote.value.trim()
  if (!content || noteBusy.value || !detail.value) return
  noteBusy.value = true
  noteError.value = ''
  try {
    const note = await $fetch<HearingNote>(`/api/guesthouse/sessions/${id}/notes`, { method: 'POST', body: { content } })
    detail.value.hearingNotes = [note, ...detail.value.hearingNotes]
    newNote.value = ''
  } catch (e: any) {
    noteError.value = e?.data?.message || '追加に失敗しました。'
  } finally {
    noteBusy.value = false
  }
}

async function removeNote(noteId: string) {
  if (!detail.value || !confirm('このメモを削除しますか？')) return
  try {
    await $fetch(`/api/guesthouse/notes/${noteId}`, { method: 'DELETE' })
    detail.value.hearingNotes = detail.value.hearingNotes.filter((n) => n.id !== noteId)
  } catch (e: any) {
    noteError.value = e?.data?.message || '削除に失敗しました。'
  }
}

function startEditNote(n: HearingNote) {
  editingNoteId.value = n.id
  editingNoteContent.value = n.content
  noteError.value = ''
}

function cancelEditNote() {
  editingNoteId.value = null
  editingNoteContent.value = ''
}

async function saveEditNote(noteId: string) {
  const content = editingNoteContent.value.trim()
  if (!content || noteBusy.value || !detail.value) return
  noteBusy.value = true
  noteError.value = ''
  try {
    await $fetch(`/api/guesthouse/notes/${noteId}`, { method: 'PUT', body: { content } })
    const target = detail.value.hearingNotes.find((n) => n.id === noteId)
    if (target) target.content = content
    cancelEditNote()
  } catch (e: any) {
    noteError.value = e?.data?.message || '保存に失敗しました。'
  } finally {
    noteBusy.value = false
  }
}

async function genDiary() {
  // すでに手入力/生成済みの内容があるときは、上書きしてよいかではなく「マージするか」を確認する。
  const merge = hasDiaryContent.value
    ? confirm('すでに日記の内容が入力されています。AIが作る内容とマージしますか？\n（いいえの場合は入力内容を上書きします）')
    : false
  diaryBusy.value = true
  diaryError.value = ''
  try {
    const res = await $fetch<{ content: DiaryContent }>(`/api/guesthouse/sessions/${id}/diary`, {
      method: 'POST',
      body: merge ? { merge: true, existing: diary.value } : {},
    })
    diary.value = res.content
  } catch (e: any) {
    diaryError.value = e?.data?.message || '作成に失敗しました。'
  } finally {
    diaryBusy.value = false
  }
}

async function saveDiary() {
  diaryBusy.value = true
  diaryError.value = ''
  try {
    const saved = await $fetch<Diary>('/api/guesthouse/diaries', {
      method: 'POST',
      body: { sessionId: id, content: diary.value },
    })
    diary.value = { ...saved.content }
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

function formatDate(s: string): string {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${Number(m[2])}/${Number(m[3])}` : s || ''
}

// 取り込みプレビュー用：DB規約(UTC)の日時文字列をJSTの "M/D HH:MM" に整形する。
function formatDateTime(s: string): string {
  const d = toJSTDate(s)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${hh}:${mm}`
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
