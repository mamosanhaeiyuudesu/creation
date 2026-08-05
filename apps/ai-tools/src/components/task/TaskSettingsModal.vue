<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { Profile } from '~/composables/task/useTaskProfiles'
import { useTaskAlert, emptyAlert, type AlertSettings } from '~/composables/task/useTaskAlert'

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

const { alert, saving: alertSaving, testing, error: alertError, testResult, load: loadAlert, save: saveAlert, sendTest } = useTaskAlert()
const alertForm = ref<AlertSettings>(emptyAlert())

const activeProfile = computed(() => workingProfiles.value[activeTab.value])

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const selectedHoursLabel = computed(() =>
  alertForm.value.hours.length ? alertForm.value.hours.map(h => `${h}時`).join('・') : '未設定'
)

watch(() => props.show, async (v) => {
  if (!v) return
  workingProfiles.value = JSON.parse(JSON.stringify(props.profiles))
  activeTab.value = Math.max(0, workingProfiles.value.findIndex(p => p.id === props.activeProfileId))
  await loadAlert()
  alertForm.value = JSON.parse(JSON.stringify(alert.value))
})

function addProfile() {
  const id = Date.now().toString()
  workingProfiles.value.push({ id, name: `アカウント${workingProfiles.value.length + 1}`, key: '', token: '', excluded: '' })
  activeTab.value = workingProfiles.value.length - 1
}

function removeProfile(idx: number) {
  if (workingProfiles.value.length <= 1) return
  workingProfiles.value.splice(idx, 1)
  activeTab.value = Math.max(0, Math.min(idx, workingProfiles.value.length - 1))
}

function toggleHour(h: number) {
  const hours = alertForm.value.hours
  const i = hours.indexOf(h)
  if (i >= 0) hours.splice(i, 1)
  else hours.push(h)
  hours.sort((a, b) => a - b)
}

async function save() {
  const valid = workingProfiles.value
    .map((p, i) => ({ ...p, key: p.key.trim(), token: p.token.trim(), name: p.name.trim() || `アカウント${i + 1}` }))
    .filter(p => p.key || p.token)
  if (!valid.length) return

  const ok = await saveAlert({ ...alertForm.value, email: alertForm.value.email.trim() })
  // 保存に失敗したらモーダルを閉じずにエラーを見せる
  if (!ok) return

  emit('save', valid)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="emit('update:show', false)">
      <div class="w-[min(560px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto">
        <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">設定</h2>

        <h3 class="m-0 text-[15px] font-bold text-slate-50">🔗 Trello アカウント</h3>

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

        <!-- アカウント設定（タブで切り替え） -->
        <template v-if="activeProfile">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">アカウント名</label>
          <input v-model="activeProfile.name" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" :placeholder="`アカウント${activeTab + 1}`" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello API Key</label>
          <input v-model="activeProfile.key" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="API Key" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">Trello Token</label>
          <input v-model="activeProfile.token" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]" type="text" placeholder="Token" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-1">非表示ボード（カンマ区切り）</label>
          <textarea v-model="activeProfile.excluded" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)] resize-y min-h-[80px] font-mono text-xs leading-relaxed" rows="4" />

          <div v-if="workingProfiles.length > 1" class="flex justify-start mt-1">
            <button class="px-3 py-1.5 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-[12px] cursor-pointer transition-all hover:bg-red-500/20" @click="removeProfile(activeTab)">このアカウントを削除</button>
          </div>
        </template>

        <!-- メール通知（アカウントをまたいで共通・1ユーザーに1つ） -->
        <div class="mt-5 pt-4 border-t border-white/10 flex flex-col gap-2.5">
          <h3 class="m-0 text-[15px] font-bold text-slate-50">🔔 メール通知</h3>
          <p class="m-0 text-[12px] text-slate-400 leading-relaxed">
            重要（赤ラベル）のタスクを、毎日決まった時刻にメールでお知らせします。時刻は複数選べます。<br>
            対象は全アカウントの TODO / DOING。重要タスクが0件のときは送りません。
          </p>

          <label class="flex items-center gap-2 mt-2 cursor-pointer group w-fit" @click="alertForm.enabled = !alertForm.enabled">
            <span
              :class="[
                'w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0',
                alertForm.enabled ? 'border-rose-400/70 bg-rose-400/15' : 'border-white/20 bg-white/[0.04] group-hover:border-white/40',
              ]"
            >
              <svg v-if="alertForm.enabled" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400"><polyline points="20 6 9 17 4 12" /></svg>
            </span>
            <span :class="['text-[13px] font-medium transition-colors', alertForm.enabled ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-300']">メール通知を有効にする</span>
          </label>

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-2">メールアドレス</label>
          <input v-model="alertForm.email" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-rose-400/50 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.1)]" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" />

          <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-2">送信時刻（複数選択可・日本時間）</label>
          <div class="grid grid-cols-6 gap-1">
            <button
              v-for="h in HOURS"
              :key="h"
              type="button"
              :class="[
                'py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer',
                alertForm.hours.includes(h)
                  ? 'border-rose-400/70 bg-rose-400/15 text-rose-300'
                  : 'border-white/10 bg-white/[0.04] text-slate-500 hover:text-slate-300 hover:border-white/25',
              ]"
              @click="toggleHour(h)"
            >{{ h }}</button>
          </div>
          <p class="m-0 text-[11px] text-slate-500">選択中: {{ selectedHoursLabel }}（毎日 その時刻の0分に送信）</p>

          <div class="flex items-center gap-2 mt-2">
            <button
              class="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 text-[12px] cursor-pointer transition-all hover:bg-white/[0.12] disabled:opacity-40 disabled:cursor-not-allowed"
              :disabled="testing || !alertForm.email.trim()"
              @click="sendTest(alertForm.email.trim())"
            >{{ testing ? '送信中…' : 'テスト送信' }}</button>
            <span v-if="testResult" class="text-[12px] text-emerald-400">{{ testResult }}</span>
          </div>

          <p v-if="alertError" class="m-0 mt-1 text-[12px] text-red-400">{{ alertError }}</p>
        </div>

        <div class="flex justify-end gap-2 mt-2">
          <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="emit('update:show', false)">キャンセル</button>
          <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-sky-400 to-indigo-500 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50" :disabled="alertSaving" @click="save">{{ alertSaving ? '保存中…' : '保存して読み込む' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
