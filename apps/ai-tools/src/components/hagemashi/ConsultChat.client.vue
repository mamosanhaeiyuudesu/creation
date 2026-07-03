<template>
  <div class="flex flex-col h-[374px] py-2">
    <!-- メッセージ一覧 -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto flex flex-col gap-3 px-0.5">
      <div v-if="loadingHistory && messages.length === 0" class="text-center text-slate-500 text-sm py-10 leading-relaxed">
        履歴を読み込んでいます…
      </div>
      <div v-else-if="historyError && messages.length === 0" class="text-center text-sm py-10 leading-relaxed">
        <p class="m-0 text-red-400">履歴の読み込みに失敗しました。</p>
        <button
          class="mt-3 px-4 py-1.5 rounded-xl text-sm border border-orange-500/60 bg-orange-500/15 text-orange-200 cursor-pointer hover:bg-orange-500/25 transition-colors"
          @click="loadHistory"
        >再読み込み</button>
      </div>
      <div v-else-if="messages.length === 0" class="text-center text-slate-500 text-sm py-10 leading-relaxed">
        録音した内容やあなたの状況をふまえて相談に乗ります。<br>
        気になっていることを話しかけてみてください。
      </div>
      <div
        v-for="(m, i) in messages"
        :key="i"
        :class="m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'"
      >
        <div
          class="text-base sm:text-sm leading-relaxed whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 border"
          :class="m.role === 'user'
            ? 'bg-orange-500/15 border-orange-500/30 text-slate-100 rounded-br-sm'
            : 'bg-white/[0.04] border-white/[0.08] text-slate-200 rounded-bl-sm'"
        >{{ m.content || (m.role === 'assistant' && streaming ? '…' : '') }}</div>
        <div v-if="m.role === 'user' && m.timestamp" class="text-right text-[10px] text-slate-500 mt-0.5 mr-0.5">
          {{ formatMsgTime(m.timestamp) }}
        </div>
      </div>
    </div>

    <p v-if="errorMsg" class="m-0 mt-1.5 text-xs text-red-400">{{ errorMsg }}</p>

    <!-- 入力欄 -->
    <div class="mt-3 flex items-end gap-2">
      <textarea
        v-model="draft"
        rows="1"
        placeholder="相談したいことを入力..."
        class="flex-1 resize-none bg-white/[0.05] border border-white/[0.08] rounded-xl text-slate-200 text-sm px-3 py-2 outline-none focus:border-orange-500/60 transition-colors placeholder-slate-600 font-[inherit] max-h-32"
        :disabled="streaming"
        @input="autoGrow"
        @keydown.enter.exact="onEnter"
      />
      <button
        class="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all disabled:cursor-not-allowed"
        :class="canSend
          ? 'border-orange-500/60 bg-orange-500/15 text-orange-200 cursor-pointer hover:bg-orange-500/25'
          : 'border-white/[0.1] bg-white/[0.02] text-slate-500'"
        :disabled="!canSend"
        @click="send"
      >{{ streaming ? '…' : '送信' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface StrengthItem { title: string; content: string }
interface ProfileData {
  strengths: StrengthItem[] | string
  tendencies: StrengthItem[] | string
  advice: StrengthItem[] | string
  generatedAt?: string
}
interface SummaryItem { sentiment: 'ポジ' | 'ネガ'; text: string; date: string }
interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }

const props = defineProps<{
  profile?: ProfileData | null
  summaryItems?: SummaryItem[]
  active?: boolean
}>()

const messages = ref<ChatMessage[]>([])
const draft = ref('')
const streaming = ref(false)
const loadingHistory = ref(false)
const historyError = ref(false)
const loadedOk = ref(false)
const errorMsg = ref('')
const scrollEl = ref<HTMLElement>()

const canSend = computed(() => !streaming.value && draft.value.trim().length > 0)

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
  })
}

function formatMsgTime(iso: string): string {
  const d = toJSTDate(iso)
  const h = String(d.getUTCHours()).padStart(2, '0')
  const mi = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${mi}`
}

function onEnter(e: KeyboardEvent) {
  // 日本語変換確定のEnterでは送信しない
  if (e.isComposing || e.keyCode === 229) return
  e.preventDefault()
  send()
}

function autoGrow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${Math.min(el.scrollHeight, 128)}px`
}

async function loadHistory() {
  if (loadingHistory.value) return
  loadingHistory.value = true
  historyError.value = false
  try {
    const res = await $fetch<{ messages: ChatMessage[] }>('/api/hagemashi/consult')
    // 成功時のみ上書き。失敗時は既存の履歴を残す
    messages.value = res.messages ?? []
    loadedOk.value = true
  } catch (e) {
    // 失敗しても履歴は消さず、エラーを可視化して再読み込みできるようにする
    console.error('相談履歴の取得に失敗しました', e)
    historyError.value = true
  } finally {
    loadingHistory.value = false
    scrollToBottom()
  }
}

async function send() {
  if (!canSend.value) return
  errorMsg.value = ''
  const content = draft.value.trim()
  draft.value = ''

  const outgoing = [...messages.value, { role: 'user' as const, content }]
  messages.value.push({ role: 'user', content, timestamp: new Date().toISOString() })
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1
  streaming.value = true
  scrollToBottom()

  try {
    const resp = await fetch('/api/hagemashi/consult', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: outgoing,
        profile: props.profile ?? null,
        summaryItems: (props.summaryItems ?? []).slice(0, 30),
      }),
    })

    if (!resp.ok || !resp.body) {
      const e = await resp.json().catch(() => null)
      throw new Error(e?.statusMessage || e?.message || '返信の取得に失敗しました')
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      messages.value[assistantIndex].content += decoder.decode(value, { stream: true })
      scrollToBottom()
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '返信の取得に失敗しました'
    // 何も返ってこなかった場合は空の吹き出しを消す
    if (!messages.value[assistantIndex]?.content) messages.value.splice(assistantIndex, 1)
  } finally {
    streaming.value = false
    scrollToBottom()
  }
}

// 常時マウントされるため、初回はバックグラウンドで先読みしておく
onMounted(loadHistory)

// 相談タブが表示されたとき、まだ読み込めていなければ再取得する
// （初回の取得が失敗しても、タブを開き直せば自動でリトライされる）
watch(
  () => props.active,
  (active) => {
    if (active && !loadedOk.value && !loadingHistory.value) loadHistory()
  }
)
</script>
