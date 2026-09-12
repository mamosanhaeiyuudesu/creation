<script setup lang="ts">
import type { KoubaTheme } from '~/types/kouba'
import { formatKoubaThemePeriod } from '~/types/kouba'

// これまで掲げたテーマの一覧。1日以上掲げたものだけをサーバーが返す（短命な書き直しは出さない）。
defineProps<{ show: boolean; themes: KoubaTheme[] }>()
const emit = defineEmits<{ 'update:show': [value: boolean] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="emit('update:show', false)"
    >
      <div class="w-[min(520px,100%)] max-h-[80vh] bg-[#1e293b] border border-white/10 rounded-2xl flex flex-col overflow-hidden">
        <div class="flex items-center justify-between gap-3 px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div>
            <h2 class="m-0 text-base font-bold text-slate-50">これまでのテーマ</h2>
            <p class="m-0 mt-0.5 text-[11px] text-slate-500">1日以上掲げたものだけ</p>
          </div>
          <button
            class="w-8 h-8 rounded-lg text-slate-400 hover:bg-white/10 flex items-center justify-center shrink-0"
            title="閉じる"
            @click="emit('update:show', false)"
          >✕</button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-2">
          <div v-if="!themes.length" class="text-center text-slate-500 text-[13px] py-6">まだありません</div>
          <div v-for="t in themes" :key="t.id" class="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <p class="m-0 text-[14px] font-bold text-slate-100 break-words">{{ t.text }}</p>
            <p class="m-0 mt-1 text-[11px] text-slate-500 tabular-nums">{{ formatKoubaThemePeriod(t) }}</p>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
