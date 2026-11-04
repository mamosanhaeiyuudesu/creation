<template>
  <ParamField label="LoRA" :help="help">
    <p v-if="!loras.length" class="text-[13px] text-[var(--pl-ink-soft)]">LoRA なしで生成します。使うときは、右上の「LoRA を管理」で登録してください。</p>
    <ul v-else class="space-y-2">
      <li v-for="l in loras" :key="l.id" class="rounded-lg border p-2.5" :class="selected[l.id]?.on ? 'border-[var(--pl-teal)] bg-[var(--pl-teal-soft)]' : 'border-[var(--pl-line)] bg-white'">
        <label class="flex items-center gap-2 cursor-pointer">
          <input v-model="selected[l.id]!.on" type="checkbox" class="accent-[var(--pl-teal)] w-4 h-4" />
          <span class="font-bold text-[14px] truncate">{{ l.name }}</span>
          <span v-if="l.triggerWord" class="pl-chip">{{ l.triggerWord }}</span>
        </label>
        <div v-if="selected[l.id]?.on" class="mt-2 flex items-center gap-3">
          <input v-model.number="selected[l.id]!.scale" type="range" min="0" max="4" step="0.05" class="flex-1 accent-[var(--pl-teal)]" :aria-label="`${l.name}の強さ`" />
          <input v-model.number="selected[l.id]!.scale" type="number" min="0" max="4" step="0.05" class="pl-input !w-[72px] text-center" />
        </div>
      </li>
    </ul>
  </ParamField>
</template>

<script setup lang="ts">
// LoRA の選択欄（画像のタブと動画のタブで共用）。selected はページが持つ reactive をそのまま書き換える
// （選択はタブをまたいで共有し、localStorage への保存もページ側で行う）。
import ParamField from '~/components/palette/ParamField.vue'
import type { PaletteLora } from '~/types/palette'

withDefaults(
  defineProps<{
    loras: PaletteLora[]
    selected: Record<string, { on: boolean; scale: number }>
    help?: string
  }>(),
  { help: '絵柄や人物などを覚えさせた追加データです。使うものを選び、強さを決めます。高いほど特徴が強く出て、崩れるときは 0.6〜0.8 に下げます。' }
)
</script>
