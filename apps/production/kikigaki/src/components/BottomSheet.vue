<template>
  <Teleport to="body">
    <Transition name="kk-sheet-backdrop-t">
      <div v-if="modelValue" class="kk-sheet-backdrop" @click.self="requestClose">
        <Transition name="kk-sheet-panel-t" appear>
          <div class="kk-sheet-panel" role="dialog" aria-modal="true" :aria-label="title">
            <div class="kk-sheet-handle" />
            <div class="kk-sheet-head">
              <h2 class="kk-h2">{{ title }}</h2>
              <button
                v-if="closable"
                type="button"
                class="kk-sheet-close"
                aria-label="閉じる"
                @click="requestClose"
              >
                ✕
              </button>
            </div>
            <div class="kk-sheet-body">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
  title: string
  /** まとめの処理中など、誤って閉じられると困るときに false にする */
  closable?: boolean
}>()
const emit = defineEmits<{ 'update:modelValue': [boolean] }>()

function requestClose() {
  if (props.closable === false) return
  emit('update:modelValue', false)
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) requestClose()
}

// 開いている間は背景のスクロールを止める（シートの中だけ動かせるようにする）
watch(
  () => props.modelValue,
  (open) => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = open ? 'hidden' : ''
  }
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  if (typeof document !== 'undefined') document.body.style.overflow = ''
})
</script>
