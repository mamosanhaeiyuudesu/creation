<template>
  <div class="genogram-modal-backdrop" @click.self="emit('close')">
    <div
      ref="modalRef"
      class="genogram-modal"
      :class="{ 'genogram-modal-dragging': dragging }"
      :style="{ transform: `translate(${offsetX}px, ${offsetY}px)` }"
      role="dialog"
      aria-modal="true"
      @pointerdown="onPointerDown"
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

withDefaults(defineProps<{ width?: string }>(), { width: '420px' })
const emit = defineEmits<{ close: [] }>()

// Escapeで閉じられないと、入力欄にフォーカスがあるときの逃げ道が背景クリックしか無くなる
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  stopDrag()
})

// --- ドラッグで移動 ---------------------------------------------------------
// ポップアップが図の見たい部分を隠してしまうので、タイトル部分をつかんで動かせるようにする。
// タイトルは各ポップアップ側(slot)にあるため、掴んだ場所が .genogram-modal-title かどうかで判定する。
const modalRef = ref<HTMLElement | null>(null)
const offsetX = ref(0)
const offsetY = ref(0)
const dragging = ref(false)

let startX = 0
let startY = 0
let baseX = 0
let baseY = 0
// 画面外に飛ばしてつかめなくならないよう、ドラッグ開始時の位置から動かせる範囲を決めておく
let minDx = 0
let maxDx = 0
let minDy = 0
let maxDy = 0

const KEEP_VISIBLE = 80

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max)
}

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement | null
  if (!target?.closest('.genogram-modal-title')) return

  const el = modalRef.value
  if (!el) return
  // rect には現在の transform が反映済みなので、ここから先は差分(dx/dy)だけを見ればよい
  const rect = el.getBoundingClientRect()
  minDx = -(rect.left + rect.width - KEEP_VISIBLE)
  maxDx = window.innerWidth - rect.left - KEEP_VISIBLE
  minDy = -rect.top
  maxDy = window.innerHeight - rect.top - 40

  startX = e.clientX
  startY = e.clientY
  baseX = offsetX.value
  baseY = offsetY.value
  dragging.value = true

  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', stopDrag)
  window.addEventListener('pointercancel', stopDrag)
}

function onPointerMove(e: PointerEvent) {
  offsetX.value = baseX + clamp(e.clientX - startX, minDx, maxDx)
  offsetY.value = baseY + clamp(e.clientY - startY, minDy, maxDy)
}

function stopDrag() {
  dragging.value = false
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', stopDrag)
  window.removeEventListener('pointercancel', stopDrag)
}
</script>

<style scoped>
.genogram-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 20px;
}

.genogram-modal {
  background: #ffffff;
  border-radius: 12px;
  padding: 20px;
  width: min(v-bind(width), 100%);
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.25);
}

.genogram-modal-dragging {
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.35);
  user-select: none;
}

/* タイトルがドラッグの取っ手。タッチでは touch-action を切らないとスクロールに取られる */
.genogram-modal :deep(.genogram-modal-title) {
  cursor: move;
  touch-action: none;
}
</style>
