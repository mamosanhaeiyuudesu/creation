<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[560px] h-[88dvh] sm:h-[80dvh] flex flex-col bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
      <!-- ヘッダー -->
      <div class="shrink-0 flex items-center justify-between px-5 py-3 bg-[#0f172a]/95 backdrop-blur border-b border-white/[0.06]">
        <h2 class="text-sm font-bold text-slate-100">🤖 アドバイス＆相談</h2>
        <button class="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
      </div>

      <!-- スレッド -->
      <div ref="scrollRef" class="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 [scrollbar-width:thin]">
        <div v-if="initialLoading" class="m-auto text-slate-500 text-sm">読み込み中…</div>

        <template v-for="item in rendered" :key="item.key">
          <!-- 日付帯 -->
          <div v-if="item.type === 'day'" class="flex items-center gap-3 my-1">
            <div class="flex-1 h-px bg-white/[0.07]" />
            <span class="text-[11px] font-semibold text-slate-500 tabular-nums">{{ item.label }}</span>
            <div class="flex-1 h-px bg-white/[0.07]" />
          </div>

          <!-- アドバイスカード -->
          <div v-else-if="item.msg.kind === 'advice'" class="rounded-2xl bg-emerald-500/[0.07] border border-emerald-400/15 px-4 py-3 flex flex-col gap-1.5">
            <div class="text-[10px] font-semibold text-emerald-400/80">🤖 今日のアドバイス</div>
            <div class="text-sm font-bold text-slate-100 leading-snug">{{ item.msg.headline }}</div>
            <p class="text-sm text-slate-300 leading-relaxed">
              <template v-for="(seg, j) in renderBold(item.msg.content)" :key="j">
                <strong v-if="seg.bold" class="font-semibold text-white">{{ seg.text }}</strong>
                <template v-else>{{ seg.text }}</template>
              </template>
            </p>
          </div>

          <!-- 対話バブル -->
          <div v-else class="flex" :class="item.msg.role === 'user' ? 'justify-end' : 'justify-start'">
            <div
              class="max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
              :class="item.msg.role === 'user' ? 'bg-emerald-500/15 text-emerald-50' : 'bg-white/[0.05] text-slate-200'"
            >
              <template v-for="(seg, j) in renderBold(item.msg.content)" :key="j">
                <strong v-if="seg.bold" class="font-semibold text-white">{{ seg.text }}</strong>
                <template v-else>{{ seg.text }}</template>
              </template>
            </div>
          </div>
        </template>

        <div v-if="sending" class="flex justify-start">
          <div class="rounded-2xl px-3.5 py-2.5 bg-white/[0.05] text-slate-500 text-sm animate-pulse">考え中…</div>
        </div>
        <div v-if="error" class="text-xs text-rose-400 px-1">{{ error }}</div>
        <div ref="endRef" />
      </div>

      <!-- 入力 -->
      <form class="shrink-0 flex items-end gap-2 px-4 py-3 border-t border-white/[0.06] bg-[#0f172a]/95" @submit.prevent="send">
        <textarea
          v-model="input"
          rows="1"
          placeholder="アドバイスに続けて相談…（例: 睡眠を良くするには？）"
          class="flex-1 resize-none max-h-28 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/40 [scrollbar-width:thin]"
          @keydown.enter.exact.prevent="send"
        />
        <button
          type="submit"
          :disabled="sending || !input.trim()"
          class="shrink-0 h-9 px-4 rounded-xl bg-emerald-500/90 text-white text-sm font-semibold disabled:opacity-40 hover:bg-emerald-500 transition-colors"
        >送信</button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import type { ThreadMessage } from '~/types/fitbit'
import { toJSTDate, mdWeekday } from '~/utils/jst'
import { splitBold as renderBold } from '~/utils/text'

const props = defineProps<{ date: string }>()
defineEmits<{ close: [] }>()

const messages = ref<ThreadMessage[]>([])
const input = ref('')
const initialLoading = ref(true)
const sending = ref(false)
const error = ref('')
const scrollRef = ref<HTMLElement | null>(null)
const endRef = ref<HTMLElement | null>(null)

/** epoch秒 → JSTの "YYYY-MM-DD" */
function jstDay(createdAt: number): string {
  return toJSTDate(new Date(createdAt * 1000)).toISOString().slice(0, 10)
}

// メッセージ列に、日付が変わる箇所で日付帯を差し込んだ描画用リスト
const rendered = computed(() => {
  const out: ({ type: 'day'; key: string; label: string } | { type: 'msg'; key: string; msg: ThreadMessage })[] = []
  let prevDay = ''
  for (const m of messages.value) {
    const day = jstDay(m.createdAt)
    if (day !== prevDay) {
      out.push({ type: 'day', key: `day-${day}`, label: mdWeekday(day) })
      prevDay = day
    }
    out.push({ type: 'msg', key: m.id, msg: m })
  }
  return out
})

async function scrollToEnd() {
  await nextTick()
  endRef.value?.scrollIntoView({ block: 'end' })
}

async function loadThread() {
  initialLoading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ messages: ThreadMessage[] }>('/api/fitbit/thread', { params: { date: props.date } })
    messages.value = res.messages
  } catch (e: any) {
    error.value = e?.data?.message || 'スレッドの取得に失敗しました'
  } finally {
    initialLoading.value = false
    scrollToEnd()
  }
}

async function send() {
  const content = input.value.trim()
  if (!content || sending.value) return
  error.value = ''
  input.value = ''
  sending.value = true
  // 楽観的にユーザー発言を表示
  messages.value.push({ id: `tmp-${Date.now()}`, role: 'user', kind: 'chat', headline: null, content, createdAt: Math.floor(Date.now() / 1000) })
  scrollToEnd()
  try {
    const res = await $fetch<{ user: ThreadMessage; assistant: ThreadMessage }>('/api/fitbit/chat', {
      method: 'POST',
      body: { content, date: props.date, days: 30 },
    })
    // 仮のユーザー発言を確定版に差し替え、返信を追加
    messages.value.pop()
    messages.value.push(res.user, res.assistant)
  } catch (e: any) {
    messages.value.pop()
    error.value = e?.data?.message || '応答の取得に失敗しました'
  } finally {
    sending.value = false
    scrollToEnd()
  }
}

onMounted(loadThread)
</script>
