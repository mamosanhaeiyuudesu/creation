<template>
  <textarea
    ref="el"
    class="kk-input resize-none overflow-hidden"
    :value="modelValue"
    :placeholder="placeholder"
    rows="1"
    @input="onInput"
  />
</template>

<script setup lang="ts">
// 中身の量にあわせて高さが伸びるテキスト入力。
// 議事録の決定事項・検討事項は1行に収まらないことが多く、input だと長い項目の後ろが
// 見切れて「何が書いてあるか読めないまま承認する」ことになるため、必ずこれを使う。
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<{ modelValue: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const el = ref<HTMLTextAreaElement | null>(null)

function resize() {
  const t = el.value
  if (!t) return
  t.style.height = 'auto'
  t.style.height = `${t.scrollHeight}px`
}

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
  nextTick(resize)
}

// 外から値が入れ替わったとき（読み込み・AI再生成）も測り直す
watch(() => props.modelValue, () => nextTick(resize))
onMounted(resize)
</script>
