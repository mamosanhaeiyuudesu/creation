<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[3px]"
      @click.self="emit('close')"
      @keydown.esc="emit('close')"
    >
      <!-- 中身（NikkiDictionary / NikkiSetup）は自前の「閉じる」を持つので、ここは面と枠だけ -->
      <div class="nk-sheet w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl p-3 shadow-[0_24px_70px_rgba(34,37,44,0.45)]">
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const emit = defineEmits<{ close: [] }>()

// 背景のスクロールを止める
onMounted(() => { document.body.style.overflow = 'hidden' })
onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>
