<template>
  <div>
    <ul class="flex flex-col gap-3">
      <li
        v-for="c in comments"
        :key="c.id"
        class="flex gap-2.5"
        :class="c.role === 'admin' ? 'flex-row-reverse text-right' : ''"
      >
        <div
          class="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base"
          :style="{ background: c.role === 'admin' ? 'color-mix(in srgb, var(--kaki-leaf) 22%, white)' : 'color-mix(in srgb, var(--kaki-persimmon) 20%, white)' }"
          style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif"
        >{{ c.role === 'admin' ? '🧑‍🌾' : '🧺' }}</div>
        <div class="min-w-0 max-w-[80%]">
          <div class="flex items-center gap-1.5 mb-0.5" :class="c.role === 'admin' ? 'justify-end' : ''">
            <span class="text-[12px] font-bold text-[var(--kaki-ink)]">{{ c.role === 'admin' ? '農家さん' : c.username }}</span>
            <span class="text-[10px] text-[var(--kaki-ink-soft)]">{{ formatDate(c.createdAt) }}</span>
          </div>
          <div
            class="inline-block px-3.5 py-2 text-[14px] leading-relaxed rounded-2xl whitespace-pre-wrap break-words"
            :style="c.role === 'admin'
              ? { background: 'color-mix(in srgb, var(--kaki-leaf) 14%, white)', color: 'var(--kaki-ink)', borderTopRightRadius: '4px' }
              : { background: 'var(--kaki-card)', color: 'var(--kaki-ink)', border: '1px solid var(--kaki-line)', borderTopLeftRadius: '4px' }"
          >{{ c.body }}</div>
        </div>
      </li>
    </ul>
    <p v-if="!comments.length" class="text-sm text-[var(--kaki-ink-soft)] text-center py-5">まだ応援の声がありません。最初のひとことを送ってみませんか。</p>

    <form class="mt-4 flex items-end gap-2" @submit.prevent="submit">
      <textarea
        v-model="text"
        rows="2"
        :placeholder="placeholder"
        class="flex-1 resize-none rounded-2xl bg-[var(--kaki-card)] border border-[var(--kaki-line)] px-4 py-2.5 text-[14px] text-[var(--kaki-ink)] placeholder:text-[var(--kaki-ink-soft)]/70 focus:outline-none focus:border-[var(--kaki-persimmon)] transition-colors"
        @keydown.meta.enter="submit"
      />
      <button
        type="submit"
        :disabled="!text.trim() || sending"
        class="shrink-0 h-11 px-4 rounded-full font-bold text-white text-sm bg-[var(--kaki-persimmon)] hover:bg-[var(--kaki-persimmon-deep)] disabled:opacity-40 transition-colors"
      >{{ sending ? '送信中' : 'おくる' }}</button>
    </form>
    <p v-if="error" class="text-[12px] text-[var(--kaki-clay)] mt-1.5">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Comment } from '~/types/kaki'

const props = withDefaults(defineProps<{ comments: Comment[]; treeId: string; placeholder?: string }>(), {
  placeholder: 'この子への応援メッセージ…',
})
const emit = defineEmits<{ added: [comment: Comment] }>()

const text = ref('')
const sending = ref(false)
const error = ref('')

async function submit() {
  const body = text.value.trim()
  if (!body || sending.value) return
  sending.value = true
  error.value = ''
  try {
    const c = await $fetch<Comment>('/api/kaki/comments', {
      method: 'POST',
      body: { treeId: props.treeId, body },
    })
    emit('added', c)
    text.value = ''
  } catch (e: any) {
    error.value = e?.data?.message || e?.statusMessage || '送信に失敗しました'
  } finally {
    sending.value = false
  }
}

function formatDate(d: string): string {
  const m = d.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
  if (m) return `${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}`
  const d2 = d.match(/(\d{4})-(\d{2})-(\d{2})/)
  return d2 ? `${Number(d2[2])}/${Number(d2[3])}` : d
}
</script>
