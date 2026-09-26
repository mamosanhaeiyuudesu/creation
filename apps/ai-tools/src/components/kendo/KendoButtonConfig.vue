<template>
  <div class="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
    <div class="w-full max-w-2xl">
      <p class="m-0 mb-3 text-sm text-slate-300">
        「変更」を押してから、コントローラーのボタンを押すと割り当てが変わります（コントローラーごとに保存）。
      </p>
      <div class="grid grid-cols-2 gap-4">
        <div v-for="p in players" :key="p.id" class="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
          <div class="flex items-center justify-between mb-2">
            <span :class="['px-2 py-0.5 rounded text-xs font-bold', p.badge]">{{ p.label }}</span>
            <span class="text-[11px] text-slate-500 truncate max-w-[60%]">
              {{ pads[p.id].connected ? pads[p.id].name : '未接続' }}
            </span>
          </div>
          <div v-for="a in actions" :key="a.key" class="flex items-center justify-between py-1 text-sm">
            <span class="text-slate-300">{{ a.label }}</span>
            <span class="flex items-center gap-2">
              <code class="text-xs text-slate-400">{{ (bindings[p.id][a.key] ?? []).join(', ') }}</code>
              <button
                :class="[
                  'text-xs px-2 py-0.5 rounded border cursor-pointer',
                  isCapturing(p.id, a.key)
                    ? 'border-amber-400 text-amber-300 bg-amber-400/10'
                    : 'border-white/10 text-slate-300 bg-white/[0.04] hover:bg-white/[0.08]',
                ]"
                @click="emit('capture', p.id, a.key)"
              >
                {{ isCapturing(p.id, a.key) ? 'ボタンを押して…' : '変更' }}
              </button>
            </span>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-4">
        <button class="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-slate-300 bg-transparent cursor-pointer hover:bg-white/[0.06]" @click="emit('reset')">
          初期値に戻す
        </button>
        <button class="text-xs px-3 py-1.5 rounded-lg border-none bg-emerald-500 text-slate-950 font-bold cursor-pointer hover:bg-emerald-400" @click="emit('close')">
          閉じる
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 剣道ゲーム（第1弾・第2弾）共通のボタン設定。押されたボタン番号の読み取りはページのゲームループ側で行い、
// ここは割り当ての表示と「どこを変更中か」の受け渡しだけ。
import type { PadStatus } from '~/utils/kendo-client/input'

type PlayerId = 0 | 1

const props = defineProps<{
  players: readonly { id: PlayerId; label: string; badge: string }[]
  actions: readonly { key: string; label: string }[]
  bindings: readonly [Record<string, number[]>, Record<string, number[]>]
  pads: readonly [PadStatus, PadStatus]
  capture: { slot: PlayerId; action: string } | null
}>()

const emit = defineEmits<{
  capture: [slot: PlayerId, action: string]
  reset: []
  close: []
}>()

function isCapturing(slot: PlayerId, action: string) {
  return props.capture?.slot === slot && props.capture.action === action
}
</script>
