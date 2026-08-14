<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const isOpen = ref(false)
const tempYear = ref(0)
const tempMonth = ref(0)

const WEEK = ['日', '月', '火', '水', '木', '金', '土']

const currentDate = computed(() => {
  if (!props.modelValue) return null
  const d = new Date(props.modelValue)
  return isNaN(d.getTime()) ? null : d
})

const displayLabel = computed(() => {
  if (!currentDate.value) return null
  const d = currentDate.value
  const date = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
  if (d.getHours() === 23 && d.getMinutes() === 59) return date
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${date} ${time}`
})

function open() {
  const base = currentDate.value ?? new Date()
  tempYear.value = base.getFullYear()
  tempMonth.value = base.getMonth()
  isOpen.value = true
}

const monthLabel = computed(() => `${tempYear.value}年${tempMonth.value + 1}月`)

const gridDays = computed(() => {
  const offset = new Date(tempYear.value, tempMonth.value, 1).getDay() // 日曜始まり
  const total = new Date(tempYear.value, tempMonth.value + 1, 0).getDate()
  const cells: (number | null)[] = Array(offset).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
})

function prevMonth() {
  if (tempMonth.value === 0) { tempYear.value--; tempMonth.value = 11 }
  else tempMonth.value--
}

function nextMonth() {
  if (tempMonth.value === 11) { tempYear.value++; tempMonth.value = 0 }
  else tempMonth.value++
}

function isSelected(day: number | null) {
  if (day === null || !currentDate.value) return false
  return currentDate.value.getFullYear() === tempYear.value && currentDate.value.getMonth() === tempMonth.value && currentDate.value.getDate() === day
}

function isToday(day: number | null) {
  if (day === null) return false
  const t = nowJST()
  return t.getUTCFullYear() === tempYear.value && t.getUTCMonth() === tempMonth.value && t.getUTCDate() === day
}

// 日をクリックした瞬間に23:59で確定し、カレンダーを閉じる
function pickDay(day: number) {
  const yyyy = tempYear.value
  const mm = String(tempMonth.value + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  emit('update:modelValue', `${yyyy}-${mm}-${dd}T23:59`)
  isOpen.value = false
}

function pickToday() {
  const t = nowJST()
  tempYear.value = t.getUTCFullYear()
  tempMonth.value = t.getUTCMonth()
  pickDay(t.getUTCDate())
}

function clear() {
  emit('update:modelValue', '')
  isOpen.value = false
}
</script>

<template>
  <div class="relative">
    <!-- トリガー -->
    <button
      type="button"
      class="w-full bg-white/[0.06] border border-white/10 rounded-lg px-3 py-2.5 text-[13px] font-[inherit] text-left outline-none cursor-pointer transition-all hover:border-white/20 focus:border-sky-400/50 focus:shadow-[0_0_0_3px_rgba(56,189,248,0.1)]"
      :class="displayLabel ? 'text-[#e2e8f0]' : 'text-slate-500'"
      @click="open"
    >
      {{ displayLabel ?? '期限を設定' }}
    </button>

    <!-- カレンダーポップアップ -->
    <Teleport to="body">
      <div v-if="isOpen" class="fixed inset-0 z-[2000]" @click.self="isOpen = false">
        <div
          class="absolute bg-[#1e293b] border border-white/10 rounded-2xl p-4 shadow-2xl w-[300px]"
          style="top: 50%; left: 50%; transform: translate(-50%, -50%)"
          @click.stop
        >
          <!-- 月ナビ -->
          <div class="flex items-center justify-between mb-3">
            <button type="button" class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-base" @click="prevMonth">‹</button>
            <span class="text-[13px] font-semibold text-slate-200">{{ monthLabel }}</span>
            <button type="button" class="w-7 h-7 rounded-lg text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-base" @click="nextMonth">›</button>
          </div>

          <!-- 曜日ヘッダー -->
          <div class="grid grid-cols-7 mb-1">
            <div
              v-for="w in WEEK"
              :key="w"
              class="text-center text-[11px] font-semibold py-1"
              :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'"
            >{{ w }}</div>
          </div>

          <!-- 日グリッド -->
          <div class="grid grid-cols-7 gap-y-0.5">
            <div v-for="(day, i) in gridDays" :key="i" class="flex justify-center">
              <button
                v-if="day !== null"
                type="button"
                class="w-8 h-8 rounded-full text-[13px] transition-all"
                :class="[
                  isSelected(day)
                    ? 'bg-sky-500 text-white font-semibold'
                    : isToday(day)
                      ? 'text-sky-400 font-semibold hover:bg-white/10'
                      : 'text-slate-300 hover:bg-white/10',
                  (i % 7 === 6) && !isSelected(day) ? 'text-sky-400' : '',
                  (i % 7 === 0) && !isSelected(day) ? 'text-rose-400' : '',
                ]"
                @click="pickDay(day)"
              >{{ day }}</button>
            </div>
          </div>

          <!-- ボタン行 -->
          <div class="mt-3 flex items-center gap-2">
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-[12px] text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
              @click="clear"
            >削除</button>
            <button
              type="button"
              class="px-3 py-1.5 rounded-lg text-[12px] text-slate-300 border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] transition-colors"
              @click="pickToday"
            >今日</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
