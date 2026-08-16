<script setup lang="ts">
import { ref, computed, watch } from 'vue'

/**
 * 振り返りの対象期間を選ぶカレンダー（月曜始まり）。
 * 各週の左端の「週」ボタンで月〜日をまとめて選べる（振り返りの既定がその週なので最短手順にしている）。
 * 日を1回押すと開始、もう1回押すと終了（逆順に押しても入れ替えて解釈する）。
 */

const props = defineProps<{ start: string; end: string }>()
const emit = defineEmits<{ 'update:start': [value: string]; 'update:end': [value: string] }>()

const WEEK = ['月', '火', '水', '木', '金', '土', '日']

function pad(n: number) { return String(n).padStart(2, '0') }
function ymd(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function addDays(dateStr: string, days: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return ymd(new Date(y, m - 1, d + days))
}

const initial = props.start || todayJST()
const viewYear = ref(Number(initial.slice(0, 4)))
const viewMonth = ref(Number(initial.slice(5, 7)) - 1) // 0-11

// 外から期間が差し替わったら（「今週に戻す」等）その月へ表示を移す
watch(() => props.start, (v) => {
  if (!v) return
  const [y, m] = v.split('-').map(Number)
  viewYear.value = y
  viewMonth.value = m - 1
})

const monthLabel = computed(() => `${viewYear.value}年${viewMonth.value + 1}月`)

function prevMonth() {
  if (viewMonth.value === 0) { viewYear.value--; viewMonth.value = 11 }
  else viewMonth.value--
}

function nextMonth() {
  if (viewMonth.value === 11) { viewYear.value++; viewMonth.value = 0 }
  else viewMonth.value++
}

// 月をまたいだ日も含めて「週の行」として持つ（週まるごと選択をきれいに扱うため）
const weeks = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const offset = (first.getDay() + 6) % 7 // 月曜始まり
  const rows: { monday: string; days: { date: string; day: number; outside: boolean }[] }[] = []
  for (let w = 0; w < 6; w++) {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(viewYear.value, viewMonth.value, 1 - offset + w * 7 + i)
      return { date: ymd(d), day: d.getDate(), outside: d.getMonth() !== viewMonth.value }
    })
    rows.push({ monday: days[0].date, days })
  }
  return rows
})

// 次のクリックが「終了日」かどうか。null なら次のクリックで新しい期間を開始する。
const pendingStart = ref<string | null>(null)

function pickDay(date: string) {
  if (pendingStart.value === null) {
    pendingStart.value = date
    emit('update:start', date)
    emit('update:end', date)
    return
  }
  const anchor = pendingStart.value
  emit('update:start', anchor <= date ? anchor : date)
  emit('update:end', anchor <= date ? date : anchor)
  pendingStart.value = null
}

function pickWeek(monday: string) {
  pendingStart.value = null
  emit('update:start', monday)
  emit('update:end', addDays(monday, 6))
}

function inRange(date: string) { return date >= props.start && date <= props.end }
function isEdge(date: string) { return date === props.start || date === props.end }
function isWeekSelected(monday: string) { return props.start === monday && props.end === addDays(monday, 6) }

const today = computed(() => todayJST())
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-2">
      <button type="button" class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="prevMonth">‹</button>
      <span class="text-[13px] font-semibold text-slate-200">{{ monthLabel }}</span>
      <button type="button" class="w-7 h-7 flex items-center justify-center rounded-md text-slate-400 hover:bg-white/10 hover:text-slate-200 transition-colors text-sm cursor-pointer" @click="nextMonth">›</button>
    </div>

    <div class="grid grid-cols-[28px_repeat(7,1fr)] mb-1">
      <div />
      <div
        v-for="w in WEEK"
        :key="w"
        class="text-center text-[10px] font-semibold py-0.5"
        :class="w === '土' ? 'text-sky-400' : w === '日' ? 'text-rose-400' : 'text-slate-500'"
      >{{ w }}</div>
    </div>

    <div v-for="row in weeks" :key="row.monday" class="grid grid-cols-[28px_repeat(7,1fr)] items-center">
      <button
        type="button"
        class="w-6 h-6 mx-auto rounded-md text-[10px] transition-colors cursor-pointer"
        :class="isWeekSelected(row.monday)
          ? 'bg-violet-500/30 text-violet-200 font-semibold'
          : 'text-slate-600 hover:bg-white/10 hover:text-slate-300'"
        title="この週（月〜日）を選ぶ"
        @click="pickWeek(row.monday)"
      >週</button>
      <div v-for="cell in row.days" :key="cell.date" class="flex justify-center py-px">
        <button
          type="button"
          class="w-7 h-7 rounded-full text-[12px] transition-all cursor-pointer"
          :class="[
            isEdge(cell.date)
              ? 'bg-violet-500 text-white font-semibold'
              : inRange(cell.date)
                ? 'bg-violet-500/20 text-violet-200'
                : cell.date === today
                  ? 'text-violet-300 font-semibold hover:bg-white/10'
                  : cell.outside ? 'text-slate-700 hover:bg-white/10' : 'text-slate-300 hover:bg-white/10',
          ]"
          @click="pickDay(cell.date)"
        >{{ cell.day }}</button>
      </div>
    </div>
  </div>
</template>
