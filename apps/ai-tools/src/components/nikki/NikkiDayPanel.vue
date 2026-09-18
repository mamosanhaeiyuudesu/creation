<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px]" @click.self="emit('close')">
      <div class="w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-[var(--nk-paper)] border border-[var(--nk-line)] rounded-t-2xl sm:rounded-2xl shadow-[0_24px_70px_rgba(34,37,44,0.35)]">
        <!-- 見出し -->
        <header class="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 pt-4 pb-3 bg-[var(--nk-paper)] border-b border-[var(--nk-line)]">
          <div>
            <h2 class="nk-serif m-0 text-[20px] leading-none" :class="date === today ? 'text-[var(--nk-today)]' : ''">
              {{ formatDateLabel(date) }}
            </h2>
            <p class="mt-1.5 mb-0 text-[11px] text-[var(--nk-ink-soft)]">
              {{ date === today ? '今日' : date.slice(0, 4) + '年' }}
            </p>
          </div>
          <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="emit('close')">閉じる</button>
        </header>

        <div class="px-5 py-4 flex flex-col gap-5">
          <!-- その日のGoogleカレンダーの予定 -->
          <section>
            <h3 class="text-[12px] font-bold text-[var(--nk-ink-soft)] tracking-wide mb-2">この日の予定</h3>
            <p v-if="loading" class="m-0 text-[12.5px] text-[var(--nk-ink-soft)]">読み込み中…</p>
            <p v-else-if="!events.length" class="m-0 text-[12.5px] text-[var(--nk-ink-soft)]">予定はありません</p>
            <ul v-else class="m-0 p-0 list-none flex flex-col gap-1.5">
              <li v-for="ev in events" :key="ev.id" class="nk-card px-3 py-2 flex items-start gap-2">
                <span class="mt-[5px] w-[6px] h-[6px] rounded-full shrink-0" :style="{ background: ev.color }" />
                <span class="min-w-0">
                  <span class="block text-[13px] font-bold leading-snug">{{ ev.title }}</span>
                  <span class="block text-[11px] text-[var(--nk-ink-soft)] leading-snug">
                    {{ ev.allDay ? '終日' : eventTime(ev) }}
                    <template v-if="ev.location"> ・{{ ev.location }}</template>
                    ・{{ ev.calendarName }}
                  </span>
                </span>
              </li>
            </ul>
          </section>

          <!-- 入力（音声 or テキスト） -->
          <section>
            <h3 class="text-[12px] font-bold text-[var(--nk-ink-soft)] tracking-wide mb-2">この日のことを話す・書く</h3>

            <div class="flex flex-wrap items-center gap-2 mb-2">
              <button v-if="!isRecording && !isPaused" class="nk-btn" :disabled="isProcessing || saving" @click="startRecording">
                🎤 録音する
              </button>
              <template v-else>
                <span class="text-[13px] font-bold tabular-nums text-[var(--nk-today)]">● {{ formatTime(duration) }}</span>
                <button v-if="isRecording" class="nk-btn-ghost" @click="pauseRecording">一時停止</button>
                <button v-else class="nk-btn-ghost" @click="resumeRecording">再開</button>
                <button class="nk-btn" @click="transcribeRecording">文字にする</button>
                <button class="nk-btn-ghost" @click="cancelRecording">やめる</button>
              </template>

              <label class="ml-auto flex items-center gap-1.5 text-[11px] text-[var(--nk-ink-soft)]">
                文字起こし
                <select v-model="transcriptionModel" class="nk-input !w-auto !py-1 !text-[11px]">
                  <option value="whisper">Whisper</option>
                  <option value="gemini">Gemini</option>
                </select>
              </label>
            </div>

            <p v-if="isProcessing" class="mb-2 text-[12px] text-[var(--nk-indigo)]">文字起こし中…</p>

            <!-- 文字起こしはそのまま保存せず、いちど直せるようにテキスト欄へ入れる -->
            <textarea
              v-model="draft"
              rows="4"
              placeholder="話したことがここに入ります。そのまま書いてもかまいません。"
              class="nk-input resize-y leading-relaxed"
            />
            <div class="flex flex-wrap items-center gap-2 mt-2">
              <button class="nk-btn" :disabled="!draft.trim() || saving" @click="submit(true)">
                {{ saving ? '保存中…' : '保存してトピックを取り出す' }}
              </button>
              <button class="nk-btn-ghost" :disabled="!draft.trim() || saving" @click="submit(false)">
                保存だけする
              </button>
            </div>
          </section>

          <!-- 抜き出された重要トピック -->
          <section>
            <div class="flex items-center justify-between gap-2 mb-2">
              <h3 class="text-[12px] font-bold text-[var(--nk-ink-soft)] tracking-wide">この日の重要トピック</h3>
              <button
                v-if="entry?.body"
                class="nk-btn-ghost !h-7 !px-2.5 !text-[11px]"
                :disabled="saving"
                @click="emit('reextract')"
              >全文から作り直す</button>
            </div>

            <p v-if="!topics.length" class="m-0 text-[12.5px] text-[var(--nk-ink-soft)] leading-relaxed">
              まだありません。話した内容から、後で読み返して手応えの残るものだけが並びます。
            </p>

            <ul v-else class="m-0 p-0 list-none flex flex-col gap-2">
              <li v-for="topic in topics" :key="topic.id" class="nk-card px-3 py-2.5">
                <!-- 編集中 -->
                <template v-if="editingId === topic.id">
                  <input v-model="editHeadline" class="nk-input !text-[13px] font-bold mb-1.5" placeholder="見出し" />
                  <textarea v-model="editDetail" rows="2" class="nk-input !text-[12px] resize-y mb-1.5" placeholder="具体（1〜2文）" />
                  <div class="flex items-center gap-2">
                    <label class="text-[11px] text-[var(--nk-ink-soft)]">インパクト</label>
                    <select v-model.number="editImpact" class="nk-input !w-auto !py-1 !text-[12px]">
                      <option :value="3">3</option>
                      <option :value="4">4</option>
                      <option :value="5">5</option>
                    </select>
                    <button class="nk-btn !h-8 !px-3 !text-[12px] ml-auto" :disabled="!editHeadline.trim() || saving" @click="commitEdit(topic.id)">
                      直す
                    </button>
                    <button class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="editingId = ''">やめる</button>
                  </div>
                </template>

                <!-- 表示 -->
                <template v-else>
                  <div class="flex items-start gap-2">
                    <span
                      class="mt-[2px] shrink-0 rounded px-1.5 text-[10px] font-bold leading-[17px]"
                      :class="`nk-impact-${Math.min(5, Math.max(3, topic.impact))}`"
                      :title="`インパクト ${topic.impact}`"
                    >{{ topic.impact }}</span>
                    <div class="min-w-0 flex-1">
                      <p class="m-0 text-[13.5px] font-bold leading-snug">{{ topic.headline }}</p>
                      <p v-if="topic.detail" class="mt-1 mb-0 text-[12px] leading-relaxed text-[var(--nk-ink-soft)]">{{ topic.detail }}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3 mt-1.5">
                    <button class="text-[11px] text-[var(--nk-indigo)] underline underline-offset-2" @click="startEdit(topic)">直す</button>
                    <button class="text-[11px] text-[var(--nk-ink-soft)] underline underline-offset-2" @click="emit('removeTopic', topic.id)">消す</button>
                    <span v-if="topic.edited" class="text-[10px] text-[var(--nk-gold)]">手で直したもの</span>
                  </div>
                </template>
              </li>
            </ul>
          </section>

          <!-- 元の全文（読み返せるように残している） -->
          <section v-if="entry?.body">
            <button class="text-[12px] font-bold text-[var(--nk-indigo)] underline underline-offset-2" @click="showBody = !showBody">
              {{ showBody ? '話した内容を閉じる' : '話した内容（全文）を読む' }}
            </button>
            <p v-if="showBody" class="mt-2 mb-0 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[var(--nk-ink)] nk-card px-3 py-2.5">
              {{ entry.body }}
            </p>
          </section>

          <p v-if="error" class="m-0 text-[12px] text-[var(--nk-today)]">{{ error }}</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAudioRecorder } from '~/composables/useAudioRecorder'
import { useTranscriptionModel } from '~/composables/useTranscriptionModel'
import { eventTime, formatDateLabel } from '~/utils/nikki-calendar'
import type { NikkiEntry, NikkiEvent, NikkiTopic } from '~/types/nikki'

const props = defineProps<{
  date: string
  today: string
  entry: NikkiEntry | null
  events: NikkiEvent[]
  loading: boolean
  saving: boolean
  error: string
  /** 保存が通った回数。増えたら下書きを空にする（updated_at は秒単位なので同じ秒の連投を拾えない） */
  savedTick: number
}>()

const emit = defineEmits<{
  close: []
  save: [text: string, extract: boolean]
  reextract: []
  patchTopic: [id: string, patch: { headline: string; detail: string; impact: number }]
  removeTopic: [id: string]
}>()

const draft = ref('')
const showBody = ref(false)
const recordError = ref('')

const topics = computed(() => props.entry?.topics ?? [])

const { transcriptionModel } = useTranscriptionModel()

// 文字起こしは下書き欄に足す（続けて録音したときに前の文章を消さない）
const { isRecording, isPaused, isProcessing, duration, formatTime, startRecording, pauseRecording, resumeRecording, transcribeRecording, cancelRecording } =
  useAudioRecorder({
    onTranscribed: (text: string) => {
      draft.value = draft.value.trim() ? `${draft.value.trim()}\n${text}` : text
    },
    onError: (msg: string) => { recordError.value = msg },
    getModel: () => transcriptionModel.value,
  })

const error = computed(() => recordError.value || props.error)

const submit = (extract: boolean) => {
  const text = draft.value.trim()
  if (!text) return
  emit('save', text, extract)
}

// 保存が通ったら下書きを空にする
watch(
  () => props.savedTick,
  () => { draft.value = '' }
)

// 日付が変わったら下書き・編集状態を持ち越さない
watch(
  () => props.date,
  () => {
    draft.value = ''
    showBody.value = false
    editingId.value = ''
    recordError.value = ''
  }
)

const editingId = ref('')
const editHeadline = ref('')
const editDetail = ref('')
const editImpact = ref(3)

const startEdit = (topic: NikkiTopic) => {
  editingId.value = topic.id
  editHeadline.value = topic.headline
  editDetail.value = topic.detail
  editImpact.value = Math.min(5, Math.max(3, topic.impact))
}

const commitEdit = (id: string) => {
  if (!editHeadline.value.trim()) return
  emit('patchTopic', id, { headline: editHeadline.value, detail: editDetail.value, impact: editImpact.value })
  editingId.value = ''
}
</script>
