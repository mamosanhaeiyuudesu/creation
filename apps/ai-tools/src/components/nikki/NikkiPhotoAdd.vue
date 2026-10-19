<template>
  <span class="inline-flex items-center">
    <button
      class="nk-btn-ghost inline-flex items-center justify-center gap-1.5"
      :class="[label ? '!h-8 !px-3 !text-[12px]' : '!h-9 !w-9 !px-0', full ? 'opacity-45' : '']"
      :disabled="busy || full"
      :title="full ? `写真は${NIKKI_PHOTO_MAX}枚までです` : `写真を追加（あと${remaining}枚）`"
      :aria-label="full ? `写真は${NIKKI_PHOTO_MAX}枚までです` : '写真を追加'"
      @click="input?.click()"
    >
      <!-- 線画のカメラ。右上の＋で「足す」操作だと分かるようにする -->
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l1.1-1.7a1 1 0 0 1 .85-.45h4.7a1 1 0 0 1 .85.45L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z" />
        <circle cx="12" cy="13" r="3.4" />
        <path d="M20 1.8v3.6M18.2 3.6h3.6" />
      </svg>
      <span v-if="busy" class="text-[11px]">送信中…</span>
      <span v-else-if="label">{{ label }}</span>
      <span v-else-if="photoCount > 0" class="text-[11px] tabular-nums">{{ photoCount }}/{{ NIKKI_PHOTO_MAX }}</span>
    </button>
    <input ref="input" type="file" accept="image/*" multiple class="hidden" @change="onPick" />
    <span v-if="message" class="ml-2 text-[11px] text-[var(--nk-today)]">{{ message }}</span>
  </span>
</template>

<script setup lang="ts">
import { fileToResizedDataUrl } from '~/utils/nikki-photo'
import { NIKKI_PHOTO_MAX } from '~/types/nikki'

const props = withDefaults(
  defineProps<{
    /** あと何枚足せるか（0なら出さない） */
    remaining: number
    busy?: boolean
    label?: string
  }>(),
  { busy: false, label: '' }
)

/** 縮小済みの data URL（選んだ順。残り枚数を超えた分は切る） */
const emit = defineEmits<{ add: [dataUrls: string[]] }>()

const full = computed(() => props.remaining <= 0)
const photoCount = computed(() => NIKKI_PHOTO_MAX - props.remaining)
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
