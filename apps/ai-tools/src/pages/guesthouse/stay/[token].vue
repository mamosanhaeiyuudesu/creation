<template>
  <div class="mx-auto max-w-[620px] min-h-screen flex flex-col px-4 sm:px-6">
    <div v-if="pending" class="flex-1 grid place-items-center text-[13px] text-[var(--gh-ink-soft)]">読み込み中…</div>

    <div v-else-if="!info" class="flex-1 grid place-items-center text-center px-6">
      <div>
        <p class="text-[16px] font-bold mb-1">リンクが無効です</p>
        <p class="text-[13px] text-[var(--gh-ink-soft)]">この共有リンクは削除されたか、期限切れの可能性があります。</p>
      </div>
    </div>

    <template v-else>
      <!-- ヘッダー -->
      <header class="pt-6 pb-3">
        <p class="text-[11px] text-[var(--gh-ink-faint)] tracking-wide mb-1">ゲストハウス案内</p>
        <h1 class="gh-display text-[22px] sm:text-[25px] font-bold leading-tight">{{ info.name }}</h1>
      </header>

      <!-- 会話エリア -->
      <div ref="scrollEl" class="flex-1 overflow-y-auto py-2 space-y-4">
        <!-- ウェルカム -->
        <div class="gh-rise">
          <div class="inline-block rounded-2xl rounded-tl-md bg-[var(--gh-card)] border border-[var(--gh-line)] px-4 py-3 max-w-[88%]">
            <p class="text-[14px] leading-relaxed whitespace-pre-wrap">{{ welcomeText }}</p>
          </div>
          <p class="gh-label-auto mt-1">自動応答</p>
        </div>

        <!-- 聞けること -->
        <div v-if="info.categories.length" class="flex flex-wrap gap-1.5">
          <button
            v-for="c in info.categories"
            :key="c"
            class="gh-chip hover:border-[var(--gh-forest-soft)] transition"
            @click="ask(c + 'について教えてください')"
          >
            {{ c }}
          </button>
        </div>

        <!-- メッセージ -->
        <div v-for="(m, i) in messages" :key="i" class="gh-rise">
          <div v-if="m.role === 'user'" class="flex justify-end">
            <div class="inline-block rounded-2xl rounded-tr-md bg-[var(--gh-forest)] text-white px-4 py-3 max-w-[88%]">
              <p class="text-[14px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
            </div>
          </div>
          <div v-else>
            <div
              class="inline-block rounded-2xl rounded-tl-md px-4 py-3 max-w-[88%] border"
              :class="m.kind === 'handoff'
                ? 'bg-[#fbf3e4] border-[color-mix(in_srgb,var(--gh-warn)_35%,transparent)]'
                : 'bg-[var(--gh-card)] border-[var(--gh-line)]'"
            >
              <p class="text-[14px] leading-relaxed whitespace-pre-wrap">{{ m.content }}</p>
            </div>
            <p :class="m.kind === 'handoff' ? 'gh-label-handoff' : 'gh-label-auto'" class="mt-1">
              {{ m.kind === 'handoff' ? '阪中さんに確認します' : '自動応答' }}
            </p>
          </div>
        </div>

        <!-- 入力中 -->
        <div v-if="sending" class="gh-rise">
          <div class="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-[var(--gh-card)] border border-[var(--gh-line)] px-4 py-3.5">
            <span class="gh-dot" style="animation-delay:0s" />
            <span class="gh-dot" style="animation-delay:0.15s" />
            <span class="gh-dot" style="animation-delay:0.3s" />
          </div>
        </div>
      </div>

      <!-- 入力欄 -->
      <div class="sticky bottom-0 bg-gradient-to-t from-[var(--gh-paper)] via-[var(--gh-paper)] to-transparent pt-3 pb-4">
        <form class="flex items-end gap-2" @submit.prevent="send">
          <textarea
            v-model="draft"
            rows="1"
            class="gh-input !py-2.5 resize-none max-h-32"
            placeholder="質問を入力（駐車場・Wi-Fiなど）"
            :disabled="sending"
            @keydown.enter.exact.prevent="send"
            @input="autoGrow"
            ref="taEl"
          />
          <button type="submit" class="gh-btn !px-5 shrink-0" :disabled="sending || !draft.trim()">送信</button>
        </form>
        <p class="text-center text-[10.5px] text-[var(--gh-ink-faint)] mt-2">
          事務的なことはAIが即答します。夜間や込み入ったご相談は、阪中さんからの返信をお待ちください。
        </p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { ChatReply, ReplyKind, StayInfo } from '~/types/guesthouse'

// 共有リンク先のお客様チャット。ログイン不要（提案資料 フェーズ1）。
definePageMeta({ layout: 'guesthouse' })

const route = useRoute()
const token = route.params.token as string

const { data: info, pending } = await useFetch<StayInfo>(`/api/guesthouse/stay/${token}`, { key: `gh-stay-${token}` })
useHead(() => ({ title: info.value?.name ? `${info.value.name} 案内` : 'ゲストハウス案内' }))

const welcomeText = computed(() => {
  const w = info.value?.welcome?.trim()
  const base = w ? w + '\n\n' : ''
  return base + 'ようこそ。ご滞在について、駐車場・チェックイン・Wi-Fiなど、なんでもお気軽にお尋ねください。'
})

interface Msg {
  role: 'user' | 'assistant'
  content: string
  kind?: ReplyKind
}
const messages = ref<Msg[]>([])
const draft = ref('')
const sending = ref(false)
const scrollEl = ref<HTMLElement | null>(null)
const taEl = ref<HTMLTextAreaElement | null>(null)

function autoGrow() {
  const el = taEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 128) + 'px'
}

async function scrollToBottom() {
  await nextTick()
  const el = scrollEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function ask(text: string) {
  if (sending.value) return
  draft.value = text
  send()
}

async function send() {
  const text = draft.value.trim()
  if (!text || sending.value) return
  messages.value.push({ role: 'user', content: text })
  draft.value = ''
  autoGrow()
  await scrollToBottom()

  sending.value = true
  try {
    const payload = messages.value.map((m) => ({ role: m.role, content: m.content }))
    const res = await $fetch<ChatReply>(`/api/guesthouse/stay/${token}/chat`, {
      method: 'POST',
      body: { messages: payload },
    })
    messages.value.push({ role: 'assistant', content: res.reply, kind: res.kind })
  } catch (e: any) {
    messages.value.push({
      role: 'assistant',
      content: e?.data?.message || 'すみません、うまくお答えできませんでした。阪中さんに確認しますね。',
      kind: 'handoff',
    })
  } finally {
    sending.value = false
    await scrollToBottom()
  }
}
</script>

<style scoped>
.gh-label-auto {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--gh-forest-deep);
  padding-left: 0.35rem;
}
.gh-label-handoff {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--gh-warn);
  padding-left: 0.35rem;
}
.gh-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--gh-ink-faint);
  display: inline-block;
  animation: gh-blink 1s infinite ease-in-out;
}
@keyframes gh-blink {
  0%, 80%, 100% { opacity: 0.25; }
  40% { opacity: 1; }
}
</style>
