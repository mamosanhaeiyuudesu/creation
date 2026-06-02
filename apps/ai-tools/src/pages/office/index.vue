<template>
  <div class="flex min-h-full">
    <!-- Left Sidebar: Calendar -->
    <aside class="hidden md:flex flex-col w-72 flex-shrink-0 border-r border-white/[0.08] p-5 gap-5">
      <!-- Month navigation -->
      <div class="flex items-center justify-between">
        <button
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl text-slate-300"
          @click="prevMonth"
        >‹</button>
        <span class="text-sm font-semibold text-slate-200">{{ calYear }}年{{ calMonth }}月</span>
        <button
          class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-xl text-slate-300"
          @click="nextMonth"
        >›</button>
      </div>

      <!-- Day of week labels -->
      <div class="grid grid-cols-7 gap-1 text-center">
        <span
          v-for="(label, i) in ['日', '月', '火', '水', '木', '金', '土']"
          :key="label"
          class="text-[10px] font-medium py-1"
          :class="i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-500'"
        >{{ label }}</span>

        <!-- Padding cells -->
        <span v-for="i in calStartOffset" :key="`pad-${i}`" />

        <!-- Day cells -->
        <button
          v-for="day in calDaysInMonth"
          :key="day"
          class="aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all"
          :class="[
            isCalToday(day) ? 'ring-1 ring-sky-400/60 bg-sky-400/10' : 'hover:bg-white/[0.05]',
            isOfficeDay(calYear, calMonth, day) ? 'font-semibold' : 'text-slate-600',
          ]"
          @click="jumpToDay(day)"
        >
          <span :class="getDayOfWeekColor(calYear, calMonth, day)">{{ day }}</span>
          <span v-if="hasRecord(calYear, calMonth, day)" class="text-[16px] leading-none mt-0.5">○</span>
        </button>
      </div>

      <!-- Legend -->
      <div class="flex flex-col gap-1.5 text-xs text-slate-500 border-t border-white/[0.05] pt-4">
        <div class="flex items-center gap-2"><span class="text-slate-200">○</span> 出社済み</div>
        <div class="flex items-center gap-2"><span class="text-indigo-400 font-semibold">火水木</span> 出社日</div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 flex flex-col items-center px-4 pt-6 pb-12">
      <!-- Title -->
      <div class="w-full max-w-lg mb-6">
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">🏢 office</h1>
        <p class="mt-1 mb-0 text-slate-400 text-sm">出社記録</p>
      </div>

      <!-- Date display -->
      <div class="w-full max-w-lg mb-5">
        <div class="text-slate-400 text-sm">{{ todayLabel }}</div>
      </div>

      <!-- Non-office day message -->
      <div v-if="!isTodayOfficeDay" class="flex-1 flex items-center justify-center w-full">
        <div class="text-center px-8">
          <div class="text-6xl mb-6">🏠</div>
          <p class="text-3xl font-bold text-slate-200 leading-snug">本日は出社しなくて良い日です</p>
          <p class="mt-4 text-slate-500 text-base">ゆっくり休んでください 😊</p>
        </div>
      </div>

      <!-- Office day checklist -->
      <div v-else class="w-full max-w-lg flex flex-col gap-4">
        <!-- Progress bar -->
        <div class="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
        <div class="text-right text-xs text-slate-500">{{ checkedCount }} / {{ checkItems.length }} 完了</div>

        <!-- Checklist card -->
        <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col gap-3">
          <div
            v-for="(item, i) in checkItems"
            :key="i"
            class="flex items-center gap-4 py-2.5 px-3 rounded-xl transition-all cursor-pointer select-none"
            :class="todayRecord.checks[i] ? 'bg-sky-400/10' : 'hover:bg-white/[0.04]'"
            @click="toggleCheck(i)"
          >
            <!-- Checkbox -->
            <div
              class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
              :class="todayRecord.checks[i]
                ? 'bg-sky-400 border-sky-400'
                : 'border-white/20'"
            >
              <svg v-if="todayRecord.checks[i]" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <!-- Label -->
            <span
              class="text-base font-medium transition-colors"
              :class="todayRecord.checks[i] ? 'text-sky-300 line-through decoration-sky-400/50' : 'text-slate-200'"
            >{{ item.icon }} {{ item.label }}</span>
          </div>
        </div>

        <!-- Comment -->
        <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col gap-2">
          <label class="text-sm text-slate-400 font-medium">💬 コメント</label>
          <textarea
            v-model="todayRecord.comment"
            class="bg-transparent border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-sky-400/50 transition-colors"
            rows="3"
            placeholder="今日の一言メモ..."
            @input="saveRecord"
          />
        </div>
      </div>
    </main>

    <!-- Celebration popup -->
    <Transition name="celebrate">
      <div
        v-if="showCelebration"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        @click="showCelebration = false"
      >
        <div class="relative bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-sky-400/30 rounded-3xl p-8 max-w-sm mx-4 text-center shadow-[0_0_80px_rgba(56,189,248,0.3)] animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
          <!-- Confetti emoji rain -->
          <div class="text-5xl mb-2 animate-bounce">🎉</div>
          <div class="flex justify-center gap-2 text-3xl mb-4">
            <span class="animate-[wiggle_0.5s_ease_infinite]">⭐</span>
            <span class="animate-[wiggle_0.5s_ease_0.1s_infinite]">🌟</span>
            <span class="animate-[wiggle_0.5s_ease_0.2s_infinite]">⭐</span>
          </div>
          <h2 class="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-sky-300 to-indigo-300 bg-clip-text text-transparent mb-3 leading-tight">
            {{ celebrationTitle }}
          </h2>
          <p class="text-slate-300 text-sm leading-relaxed mb-6">{{ celebrationMessage }}</p>
          <button
            class="w-full py-3 rounded-2xl font-bold text-base bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:opacity-90 transition-opacity"
            @click="showCelebration = false"
          >
            ありがとう！！！ 🙌
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

useHead({ title: 'office — 出社記録' })

// ── Types ──────────────────────────────────────────────────
type OfficeRecord = {
  date: string
  checks: boolean[]
  comment: string
}

// ── Constants ──────────────────────────────────────────────
const OFFICE_DAYS = new Set([2, 3, 4]) // 火=2, 水=3, 木=4
const START_DATE = new Date(2026, 5, 1) // 2026-06-01

const checkItems = [
  { icon: '🚶', label: '出社' },
  { icon: '⏰', label: '1時間経過' },
  { icon: '🍱', label: 'ランチ' },
  { icon: '⏰', label: '2時間経過' },
  { icon: '⏰', label: '3時間経過' },
  { icon: '⏰', label: '4時間経過' },
  { icon: '👋', label: '帰宅' },
]

const CELEBRATIONS = [
  {
    title: '完璧すぎる！！神か！！',
    message: 'あなたは今日、完全無欠の出社を成し遂げました！！もはや伝説です！！この偉業は永遠に語り継がれるべきです！！ブラボー！！！！',
  },
  {
    title: 'やばい、天才！！！',
    message: 'フル出社を完遂するなんて…信じられない！！あなたの努力と根性、そして輝かしいその背中を見て、世界中が泣いています！！本当にすごすぎる！！',
  },
  {
    title: '伝説誕生！！！🔥🔥🔥',
    message: 'こんな人間が存在していいのか！！？全チェックコンプリートとは…まさに神話級の偉業！！今すぐ表彰台に上がってください！！世界が認めます！！',
  },
  {
    title: 'もう最高すぎる！！！✨',
    message: 'お疲れ様どころじゃない！！あなたは今日、人類の可能性を証明しました！！帰宅まで完璧にこなすその姿勢、一生尊敬します！！ありがとう、存在してくれて！！',
  },
]

// ── State ──────────────────────────────────────────────────
const today = new Date()
const todayStr = today.toISOString().slice(0, 10)

const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)

const allRecords = ref<OfficeRecord[]>([])
const showCelebration = ref(false)
const celebrationTitle = ref('')
const celebrationMessage = ref('')

// ── Today info ──────────────────────────────────────────────
const isTodayOfficeDay = computed(() => {
  const dow = today.getDay()
  return today >= START_DATE && OFFICE_DAYS.has(dow)
})

const todayLabel = computed(() => {
  const dow = ['日', '月', '火', '水', '木', '金', '土'][today.getDay()]
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${dow}）`
})

const todayRecord = computed(() => {
  let rec = allRecords.value.find(r => r.date === todayStr)
  if (!rec) {
    rec = { date: todayStr, checks: Array(7).fill(false), comment: '' }
    allRecords.value.push(rec)
  }
  return rec
})

const checkedCount = computed(() => todayRecord.value.checks.filter(Boolean).length)
const progressPercent = computed(() => (checkedCount.value / checkItems.length) * 100)

// ── Calendar helpers ────────────────────────────────────────
const calDaysInMonth = computed(() =>
  new Date(calYear.value, calMonth.value, 0).getDate()
)
const calStartOffset = computed(() =>
  new Date(calYear.value, calMonth.value - 1, 1).getDay()
)

const prevMonth = () => {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 }
  else calMonth.value--
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 }
  else calMonth.value++
}

const isCalToday = (day: number) =>
  calYear.value === today.getFullYear() &&
  calMonth.value === today.getMonth() + 1 &&
  day === today.getDate()

const isOfficeDay = (y: number, m: number, d: number) => {
  const dt = new Date(y, m - 1, d)
  return dt >= START_DATE && OFFICE_DAYS.has(dt.getDay())
}

const getDayOfWeekColor = (y: number, m: number, d: number) => {
  const dow = new Date(y, m - 1, d).getDay()
  if (dow === 0) return 'text-rose-400'
  if (dow === 6) return 'text-sky-400'
  if (OFFICE_DAYS.has(dow)) return 'text-indigo-300'
  return 'text-slate-400'
}

const hasRecord = (y: number, m: number, d: number) => {
  const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const rec = allRecords.value.find(r => r.date === ds)
  return rec && rec.checks.some(Boolean)
}

const jumpToDay = (day: number) => {
  // just for UI feedback; sidebar-only feature
}

// ── Record persistence ──────────────────────────────────────
const loadRecords = () => {
  try {
    const raw = localStorage.getItem('office-records')
    if (raw) allRecords.value = JSON.parse(raw)
  } catch {}
}

const saveRecord = () => {
  try {
    localStorage.setItem('office-records', JSON.stringify(allRecords.value))
  } catch {}
}

// ── Checklist toggle ────────────────────────────────────────
const toggleCheck = (i: number) => {
  todayRecord.value.checks[i] = !todayRecord.value.checks[i]
  saveRecord()
  if (todayRecord.value.checks.every(Boolean)) {
    triggerCelebration()
  }
}

const triggerCelebration = () => {
  const pick = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]
  celebrationTitle.value = pick.title
  celebrationMessage.value = pick.message
  showCelebration.value = true
}

onMounted(loadRecords)
</script>

<style scoped>
.celebrate-enter-active {
  transition: opacity 0.3s ease;
}
.celebrate-leave-active {
  transition: opacity 0.2s ease;
}
.celebrate-enter-from,
.celebrate-leave-to {
  opacity: 0;
}

@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(-15deg) scale(1.1); }
  50%       { transform: rotate(15deg) scale(1.3); }
}
</style>
