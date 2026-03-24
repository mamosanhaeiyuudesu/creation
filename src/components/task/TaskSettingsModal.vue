<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Profile } from '~/composables/task/useTaskProfiles'

const props = defineProps<{
  show: boolean
  profiles: Profile[]
  activeProfileId: string
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  save: [profiles: Profile[]]
}>()

const workingProfiles = ref<Profile[]>([])
const activeTab = ref(0)

watch(() => props.show, (v) => {
  if (v) {
    workingProfiles.value = JSON.parse(JSON.stringify(props.profiles))
    activeTab.value = Math.max(0, workingProfiles.value.findIndex(p => p.id === props.activeProfileId))
  }
})

function addProfile() {
  const id = Date.now().toString()
  workingProfiles.value.push({ id, name: `アカウント${workingProfiles.value.length + 1}`, key: '', token: '', excluded: '' })
  activeTab.value = workingProfiles.value.length - 1
}

function removeProfile(idx: number) {
  if (workingProfiles.value.length <= 1) return
  workingProfiles.value.splice(idx, 1)
  activeTab.value = Math.max(0, Math.min(activeTab.value, workingProfiles.value.length - 1))
}

function save() {
  const valid = workingProfiles.value
    .map((p, i) => ({ ...p, key: p.key.trim(), token: p.token.trim(), name: p.name.trim() || `アカウント${i + 1}` }))
    .filter(p => p.key || p.token)
  if (!valid.length) return
  emit('save', valid)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="emit('update:show', false)">
      <div class="w-[min(560px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto">
        <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">設定</h2>

        <div class="flex items-end gap-0 border-b border-white/10 mb-2 overflow-x-auto">
          <button
            v-for="(p, i) in workingProfiles"
            :key="p.id"
            :class="[
              'px-3 py-1.5 text-[13px] font-medium rounded-t-lg border-b-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0',
              activeTab === i ? 'border-sky-400 text-sky-400 bg-white/[0.04]' : 'border-transparent text-slate-500 hover:text-slate-300 bg-transparent',
            ]"
            @click="activeTab = i"
          >{{ p.name || `アカウント${i + 1}` }}</button>
          <button
            class="px-2.5 py-1.5 text-[18px] leading-none text-slate-500 hover:text-sky-400 border-b-2 border-transparent cursor-pointer transition-all flex-shrink-0"
            title="新しいアカウントを追加"
            @click="addProfile"
          >＋</button>
        </div>

        <template v-if="workingProfiles[activeTab]">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">アカウント名</label>
          <input v-model="workingProfiles[activeTab].name" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" :placeholder="`アカウント${activeTab + 1}`" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello API Key</label>
          <input v-model="workingProfiles[activeTab].key" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="API Key" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello Token</label>
          <input v-model="workingProfiles[activeTab].token" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="Token" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">非表示ボード（カンマ区切り）</label>
          <textarea v-model="workingProfiles[activeTab].excluded" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] font-mono text-xs leading-relaxed" rows="4" />

          <div v-if="workingProfiles.length > 1" class="flex justify-start mt-1">
            <button class="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[12px] cursor-pointer transition-all hover:bg-red-500/20" @click="removeProfile(activeTab)">このアカウントを削除</button>
          </div>
        </template>

        <div class="flex justify-end gap-2 mt-2">
          <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="emit('update:show', false)">キャンセル</button>
          <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer" @click="save">保存して読み込む</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
