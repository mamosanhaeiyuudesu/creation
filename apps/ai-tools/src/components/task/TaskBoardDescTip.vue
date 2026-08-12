<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ desc: string }>()

const iconRef = ref<HTMLElement | null>(null)
const visible = ref(false)
const pos = ref({ x: 0, y: 0 })

function show() {
  const el = iconRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const maxW = 260
  const x = Math.min(rect.left, window.innerWidth - maxW - 12)
  pos.value = { x: Math.max(8, x), y: rect.bottom + 6 }
  visible.value = true
}

function hide() {
  visible.value = false
}
</script>

<template>
  <span
    v-if="desc"
    ref="iconRef"
    class="relative inline-flex items-center justify-center w-3.5 h-3.5 ml-1 rounded-full border border-current text-[9px] font-bold opacity-60 hover:opacity-100 cursor-help align-middle"
    @mouseenter="show"
    @mouseleave="hide"
  >?
    <Teleport to="body">
      <div
        v-if="visible"
        class="fixed z-[300] max-w-[260px] whitespace-pre-wrap rounded-lg bg-slate-900 border border-white/10 px-2.5 py-1.5 text-[11px] font-normal normal-case leading-snug text-slate-200 shadow-lg pointer-events-none"
        :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
      >{{ desc }}</div>
    </Teleport>
  </span>
</template>
