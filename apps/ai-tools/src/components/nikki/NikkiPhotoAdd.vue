<template>
  <span v-if="remaining > 0">
    <button
      class="nk-btn-ghost"
      :class="small ? '!h-7 !px-2.5 !text-[11px]' : ''"
      :disabled="busy"
      :title="`写真を追加（あと${remaining}枚）`"
      @click="input?.click()"
    >{{ busy ? '送信中…' : label }}</button>
    <input ref="input" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
    <span v-if="message" class="ml-2 text-[11px] text-[var(--nk-today)]">{{ message }}</span>
  </span>
</template>

<script setup lang="ts">
import { fileToResizedDataUrl } from '~/utils/nikki-photo'

const props = withDefaults(
  defineProps<{
    /** あと何枚足せるか（0なら出さない） */
    remaining: number
    busy?: boolean
    label?: string
    small?: boolean
  }>(),
  { busy: false, label: '📷 写真', small: false }
)

/** 縮小済みの data URL（選んだ順。残り枚数を超えた分は切る） */
const emit = defineEmits<{ add: [dataUrls: string[]] }>()

const input = ref<HTMLInputElement | null>(null)
const message = ref('')

const onPick = async (e: Event) => {
  const el = e.target as HTMLInputElement
  const files = Array.from(el.files ?? []).slice(0, props.remaining)
  el.value = ''
  message.value = ''
  if (!files.length) return
  try {
    emit('add', await Promise.all(files.map(fileToResizedDataUrl)))
  } catch (err: any) {
    message.value = err?.message || '写真を読み込めませんでした'
  }
}
</script>
