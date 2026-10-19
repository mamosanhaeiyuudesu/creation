<template>
  <section class="nk-card px-4 py-3">
    <div class="flex items-start justify-between gap-3">
      <div>
        <h2 class="nk-serif m-0 text-[14px] leading-none">辞書を編集</h2>
        <p class="mt-1 mb-0 text-[11px] text-[var(--nk-ink-soft)] leading-relaxed">
          名前や地名など、聞き間違えられやすい言葉を登録しておくと、文字起こしのときに使われます。
          「よく間違えられる表記」を入れておくと、その表記が出たら正しい言葉に置き換えます。
        </p>
      </div>
      <button class="nk-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="emit('close')">閉じる</button>
    </div>

    <form class="mt-3 flex flex-col gap-1.5" @submit.prevent="submit">
      <input v-model="word" class="nk-input !text-[13px]" placeholder="正しい言葉（例: 宮古島）" maxlength="40" />
      <input v-model="wrong" class="nk-input !text-[12px]" placeholder="よく間違えられる表記（任意・「、」区切り 例: 宮子島、宮古じま）" />
      <div class="flex items-center gap-2">
        <button type="submit" class="nk-btn !h-8 !px-3 !text-[12px]" :disabled="!word.trim() || busy">
          {{ editingId ? '修正を保存' : '登録する' }}
        </button>
        <button v-if="editingId" type="button" class="nk-btn-ghost !h-8 !px-3 !text-[12px]" @click="reset">やめる</button>
      </div>
    </form>

    <p v-if="!items.length" class="mt-3 mb-0 text-[12px] text-[var(--nk-ink-soft)]">まだ登録がありません。</p>
    <ul v-else class="mt-3 m-0 p-0 list-none flex flex-col gap-1.5">
      <li v-for="it in items" :key="it.id" class="flex items-center gap-2 px-2.5 py-2 rounded-lg border border-[var(--nk-line)]">
        <div class="min-w-0 flex-1">
          <p class="m-0 text-[13px] font-bold truncate">{{ it.word }}</p>
          <p v-if="it.wrong" class="m-0 text-[11px] text-[var(--nk-ink-soft)] truncate">← {{ it.wrong }}</p>
        </div>
        <button class="text-[11px] text-[var(--nk-indigo)] underline underline-offset-2 shrink-0" @click="startEdit(it)">修正する</button>
        <button class="text-[11px] text-[var(--nk-ink-soft)] underline underline-offset-2 shrink-0" :disabled="busy" @click="emit('remove', it.id)">消す</button>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { NikkiDictionaryEntry } from '~/utils/nikki-dictionary'

const props = defineProps<{
  items: NikkiDictionaryEntry[]
  busy: boolean
}>()

const emit = defineEmits<{
  add: [word: string, wrong: string]
  update: [id: string, word: string, wrong: string]
  remove: [id: string]
  close: []
}>()

const word = ref('')
const wrong = ref('')
const editingId = ref('')

const reset = () => {
  word.value = ''
  wrong.value = ''
  editingId.value = ''
}

const startEdit = (it: NikkiDictionaryEntry) => {
  editingId.value = it.id
  word.value = it.word
  wrong.value = it.wrong
}

const submit = () => {
  if (!word.value.trim()) return
  if (editingId.value) emit('update', editingId.value, word.value, wrong.value)
  else emit('add', word.value, wrong.value)
}

// 追加・修正が通って一覧が変わったら入力欄を空に戻す（失敗したときは入力を残す）
watch(
  () => props.items,
  () => reset()
)
</script>
