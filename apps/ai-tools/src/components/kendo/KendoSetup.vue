<template>
  <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    <div class="w-full max-w-xl flex flex-col items-center gap-5 text-slate-100">
      <div class="text-2xl sm:text-3xl font-black tracking-wider">だれと たたかう？</div>

      <div class="grid grid-cols-2 gap-3 w-full">
        <button :class="bigButton(!value.vsCom)" @click="value.vsCom = false">
          <span class="text-3xl">👫</span>
          <span>ふたりで</span>
        </button>
        <button :class="bigButton(value.vsCom)" @click="value.vsCom = true">
          <span class="text-3xl">🤖</span>
          <span>COMと</span>
        </button>
      </div>

      <div v-if="value.vsCom" class="w-full flex flex-col items-center gap-2">
        <div class="text-sm text-slate-300">COMの つよさ</div>
        <div class="grid grid-cols-5 gap-2 w-full">
          <button
            v-for="lv in 5"
            :key="lv"
            :class="[
              'rounded-xl py-2 border cursor-pointer flex flex-col items-center gap-0.5',
              value.level === lv ? 'border-amber-400 bg-amber-400/20 text-amber-200' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]',
            ]"
            @click="value.level = lv"
          >
            <span class="text-sm tracking-tighter">{{ '★'.repeat(lv) }}</span>
            <span class="text-[11px]">{{ LEVEL_LABEL[lv - 1] }}</span>
          </button>
        </div>
        <div class="text-xs text-slate-500">COMは 白（みぎ）。あなたは 赤（ひだり）で、1ばんめの コントローラーか キーボードで あそぶよ。</div>
      </div>

      <div v-if="showAges" class="w-full flex flex-col gap-2">
        <div class="text-sm text-slate-300 text-center">としは？（ちいさい ほど 竹刀が はやくなる ハンデ）</div>
        <div v-for="p in sides" :key="p.id" class="flex items-center gap-2">
          <span :class="['w-10 shrink-0 text-center px-2 py-1 rounded-lg text-sm font-bold', p.badge]">{{ p.label }}</span>
          <template v-if="p.id === 1 && value.vsCom">
            <span class="text-sm text-slate-400">🤖 COM（つよさは ★で かわる）</span>
          </template>
          <template v-else>
            <button
              v-for="age in AGES"
              :key="age"
              :class="[
                'flex-1 rounded-lg py-2 text-sm border cursor-pointer',
                value.ages[p.id] === age ? 'border-emerald-400 bg-emerald-400/20 text-emerald-200 font-bold' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]',
              ]"
              @click="value.ages[p.id] = age"
            >
              {{ AGE_LABEL[age] }}
            </button>
          </template>
        </div>
      </div>

      <button
        class="mt-1 px-10 py-3 rounded-2xl border-none bg-emerald-500 text-slate-950 text-xl font-black cursor-pointer hover:bg-emerald-400"
        @click="submit"
      >
        はじめる！
      </button>
      <div class="text-xs text-slate-500">コントローラーの START か、キーボードの スペースでも はじめられるよ</div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 試合前の選択画面（第0〜2弾共通）。年齢は第0弾だけ（showAges）。
import { reactive, watch } from 'vue'
import { AGE_LABEL } from '~/utils/kendo0/constants'
import type { Age } from '~/utils/kendo0/types'
import { copySetup } from '~/utils/kendo-client/setup'
import type { KendoSetupValue } from '~/utils/kendo-client/setup'

const props = defineProps<{
  initial: KendoSetupValue
  showAges?: boolean
}>()

const emit = defineEmits<{ start: [value: KendoSetupValue] }>()

const AGES: readonly Age[] = ['kinder', 'elementary', 'adult']
const LEVEL_LABEL = ['やさしい', 'ふつう', 'つよい', 'すごい', 'めいじん']
const sides = [
  { id: 0 as const, label: '赤', badge: 'bg-red-600 text-white' },
  { id: 1 as const, label: '白', badge: 'bg-white text-slate-900' },
]

const value = reactive<KendoSetupValue>(copySetup(props.initial))
watch(
  () => props.initial,
  (v) => Object.assign(value, copySetup(v)),
)

function bigButton(selected: boolean) {
  return [
    'rounded-2xl py-4 border-2 cursor-pointer flex flex-col items-center gap-1 text-lg font-bold',
    selected ? 'border-emerald-400 bg-emerald-400/15 text-emerald-200' : 'border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08]',
  ]
}

/** ページのゲームループから、コントローラーの START で「はじめる」を押したことにする */
function submit() {
  emit('start', copySetup(value))
}
defineExpose({ submit })
</script>
