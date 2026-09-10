<script setup lang="ts">
withDefaults(
  defineProps<{
    show: boolean
    title?: string
    message: string
    confirmLabel?: string
  }>(),
  { title: '確認', confirmLabel: '削除する' }
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="emit('cancel')"
    >
      <div class="w-[min(360px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
        <div>
          <h2 class="m-0 mb-1.5 text-sm font-bold text-slate-50">{{ title }}</h2>
          <p class="m-0 text-[13px] text-slate-300 leading-relaxed whitespace-pre-line">{{ message }}</p>
        </div>
        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="h-9 px-4 rounded-full bg-white/10 text-slate-300 text-[13px] font-semibold hover:bg-white/20"
            @click="emit('cancel')"
          >キャンセル</button>
          <button
            type="button"
            class="h-9 px-4 rounded-full bg-rose-600 text-white text-[13px] font-bold hover:bg-rose-500"
            @click="emit('confirm')"
          >{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
