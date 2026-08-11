<template>
  <div class="relative flex flex-col h-[calc(100dvh-220px)] min-h-[360px]">
    <!-- メッセージ一覧 -->
    <div ref="scrollEl" class="flex-1 overflow-y-auto flex flex-col gap-3 px-0.5 py-2" @scroll="onScroll">
      <div v-if="loadingHistory" class="text-center text-[var(--lf-ink-faint)] text-sm py-10">
        読み込んでいます…
      </div>
      <div v-else-if="historyError" class="text-center text-sm py-10">
        <p class="m-0 text-red-600">履歴の読み込みに失敗しました。</p>
        <button class="mt-3 lf-btn-ghost" @click="loadHistory">再読み込み</button>
      </div>
      <template v-for="(m, i) in messages" :key="i">
        <div :class="m.role === 'user' ? 'self-end max-w-[85%]' : 'self-start max-w-[90%]'">
          <div
            class="text-sm leading-relaxed break-words whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 border"
            :class="m.role === 'user'
              ? 'bg-[var(--lf-accent-soft)]/40 border-[var(--lf-accent-soft)] text-[var(--lf-ink)] rounded-br-sm'
              : 'bg-white border-[var(--lf-line)] text-[var(--lf-ink)] rounded-bl-sm'"
          >
            <template v-if="m.content">{{ m.content }}</template>
            <span v-else-if="streaming" class="text-[var(--lf-ink-faint)]">…</span>
          </div>
        </div>
      </template>
    </div>

    <p v-if="errorMsg" class="m-0 mt-1.5 text-xs text-red-600">{{ errorMsg }}</p>

    <!-- 入力欄 -->
    <div class="relative mt-3 flex items-end gap-2">
      <button
        v-if="!atBottom"
        class="absolute right-0 -top-9 w-8 h-8 flex items-center justify-center rounded-full border border-[var(--lf-line)] bg-white text-[var(--lf-ink-soft)] text-xs shadow-sm"
        title="一番下へ"
        @click="scrollToBottom"
      >▼</button>
      <textarea
        ref="textareaEl"
        v-model="draft"
        rows="1"
        placeholder="思い出したことを、そのまま書いてください"
        class="lf-input flex-1 resize-none max-h-32"
        :disabled="streaming"
        @input="autoGrow"
        @keydown.enter.exact="onEnter"
      />
      <button
        class="shrink-0 lf-btn disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canSend"
        @click="send"
      >{{ streaming ? '…' : '送信' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import type { LifeTheme } from '~/utils/life-themes'

interface ChatMessage { role: 'user' | 'assistant'; content: string; timestamp?: string }

const props = defineProps<{ theme: LifeTheme }>()

const messages = ref<ChatMessage[]>([])
const draft = ref('')
const streaming = ref(false)
const loadingHistory = ref(false)
const historyError = ref(false)
const errorMsg = ref('')
const scrollEl = ref<HTMLElement>()
const textareaEl = ref<HTMLTextAreaElement>()

const canSend = computed(() => !streaming.value && draft.value.trim().length > 0)

const atBottom = ref(true)
function onScroll() {
  const el = scrollEl.value
  if (!el) return
  atBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 24
}

function scrollToBottom() {
  nextTick(() => {
    if (scrollEl.value) scrollEl.value.scrollTop = scrollEl.value.scrollHeight
    onScroll()
  })
}

function onEnter(e: KeyboardEvent) {
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
  loadingHistory.value = true
  historyError.value = false
  try {
    const res = await $fetch<{ messages: ChatMessage[] }>('/api/life/history', { query: { theme: props.theme.id } })
    // 履歴が無ければ、まず聞くべき最初の問いだけをその場で表示する（保存はしない）
    messages.value = res.messages?.length ? res.messages : [{ role: 'assistant', content: props.theme.opening }]
  } catch (e) {
    console.error('履歴の取得に失敗しました', e)
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
  nextTick(() => {
    if (textareaEl.value) textareaEl.value.style.height = 'auto'
  })

  const outgoing = [...messages.value, { role: 'user' as const, content }]
  messages.value.push({ role: 'user', content })
  messages.value.push({ role: 'assistant', content: '' })
  const assistantIndex = messages.value.length - 1
  streaming.value = true
  scrollToBottom()

  try {
    const resp = await fetch('/api/life/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themeId: props.theme.id, messages: outgoing }),
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
    if (!messages.value[assistantIndex]?.content) messages.value.splice(assistantIndex, 1)
  } finally {
    streaming.value = false
    scrollToBottom()
  }
}

onMounted(loadHistory)
</script>
