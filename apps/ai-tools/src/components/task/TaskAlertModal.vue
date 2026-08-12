<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTaskAlert, emptyAlert, type AlertSettings } from '~/composables/task/useTaskAlert'

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
}>()

const { alert, saving, testing, error, testResult, load, save, sendTest } = useTaskAlert()
const form = ref<AlertSettings>(emptyAlert())

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const selectedHoursLabel = computed(() =>
  form.value.hours.length ? form.value.hours.map(h => `${h}時`).join('・') : '未設定'
)

watch(() => props.show, async (v) => {
  if (!v) return
  await load()
  form.value = JSON.parse(JSON.stringify(alert.value))
})

function toggleHour(h: number) {
  const hours = form.value.hours
  const i = hours.indexOf(h)
  if (i >= 0) hours.splice(i, 1)
  else hours.push(h)
  hours.sort((a, b) => a - b)
}

async function submit() {
  const ok = await save({ ...form.value, email: form.value.email.trim() })
  // 保存に失敗したら閉じずにエラーを見せる
  if (ok) emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-5" @click.self="emit('update:show', false)">
      <div class="w-[min(520px,100%)] bg-[#1e293b] border border-white/10 rounded-2xl p-7 flex flex-col gap-2.5 max-h-[90vh] overflow-y-auto">
        <h2 class="m-0 mb-1 text-lg font-bold text-slate-50">📧 メール設定</h2>

        <p class="m-0 text-[12px] text-slate-400 leading-relaxed">
          その日（JST）が期限のタスクを、毎日決まった時刻にメールでお知らせします。時刻は複数選べます。<br>
          対象は全アカウントの TODO / DOING。対象タスクが0件のときは送りません。
        </p>

        <label class="flex items-center gap-2 mt-2 cursor-pointer group w-fit" @click="form.enabled = !form.enabled">
          <span
            :class="[
              'w-4 h-4 rounded border flex items-center justify-center transition-all flex-shrink-0',
              form.enabled ? 'border-rose-400/70 bg-rose-400/15' : 'border-white/20 bg-white/[0.04] group-hover:border-white/40',
            ]"
          >
            <svg v-if="form.enabled" xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="text-rose-400"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
          <span :class="['text-[13px] font-medium transition-colors', form.enabled ? 'text-rose-400' : 'text-slate-400 group-hover:text-slate-300']">メール通知を有効にする</span>
        </label>

        <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-2">メールアドレス</label>
        <input v-model="form.email" class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[#e2e8f0] text-[13px] font-[inherit] box-border outline-none focus:border-rose-400/50 focus:shadow-[0_0_0_3px_rgba(251,113,133,0.1)]" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com" />

        <label class="text-xs font-semibold text-slate-500 uppercase tracking-[0.05em] mt-2">送信時刻（複数選択可・日本時間）</label>
        <div class="grid grid-cols-6 gap-1">
          <button
            v-for="h in HOURS"
            :key="h"
            type="button"
            :class="[
              'py-1.5 rounded-lg text-[12px] font-semibold border transition-all cursor-pointer',
              form.hours.includes(h)
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
            :disabled="testing || !form.email.trim()"
            @click="sendTest(form.email.trim())"
          >{{ testing ? '送信中…' : 'テスト送信' }}</button>
          <span v-if="testResult" class="text-[12px] text-emerald-400">{{ testResult }}</span>
        </div>

        <p v-if="error" class="m-0 mt-1 text-[12px] text-red-400">{{ error }}</p>

        <div class="flex justify-end gap-2 mt-3">
          <button class="px-4 py-2 rounded-lg bg-white/[0.08] border border-white/10 text-slate-400 text-[13px] cursor-pointer transition-all hover:bg-white/[0.12]" @click="emit('update:show', false)">キャンセル</button>
          <button class="px-4 py-2 rounded-lg border-none bg-gradient-to-br from-rose-400 to-pink-500 text-white text-[13px] font-semibold cursor-pointer disabled:opacity-50" :disabled="saving" @click="submit">{{ saving ? '保存中…' : '保存' }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
