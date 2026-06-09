<template>
  <div class="flex min-h-full">
    <!-- Left Sidebar: Calendar (desktop only) -->
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

        <span v-for="i in calStartOffset" :key="`pad-${i}`" />

        <button
          v-for="day in calDaysInMonth"
          :key="day"
          class="aspect-square flex flex-col items-center justify-center rounded-lg text-xs transition-all"
          :class="[
            isCalSelected(day)
              ? 'ring-2 ring-sky-400 bg-sky-400/15'
              : isCalToday(day)
                ? 'ring-1 ring-sky-400/60 bg-sky-400/10'
                : 'hover:bg-white/[0.05]',
            isOfficeDay(calYear, calMonth, day) ? 'font-semibold' : 'text-slate-600',
          ]"
          @click="selectDay(day)"
        >
          <span :class="getDayOfWeekColor(calYear, calMonth, day)">{{ day }}</span>
          <span
            v-if="getDayMark(calYear, calMonth, day)"
            class="text-[11px] leading-none mt-0.5"
            :class="getDayMarkColor(calYear, calMonth, day)"
          >{{ getDayMark(calYear, calMonth, day) }}</span>
        </button>
      </div>

      <!-- Legend -->
      <div class="flex flex-col gap-1.5 text-xs text-slate-500 border-t border-white/[0.05] pt-4">
        <div class="flex items-center gap-2"><span class="text-slate-200">○</span> 出社済み</div>
        <div class="flex items-center gap-2"><span class="text-amber-400 font-bold">不</span> 出社不要</div>
        <div class="flex items-center gap-2"><span class="text-rose-400 font-bold">休</span> 有休取得</div>
        <div class="flex items-center gap-2"><span class="text-indigo-400 font-semibold">火水木</span> 出社日</div>
      </div>
    </aside>

    <!-- Main content (desktop only) -->
    <main class="hidden md:flex flex-1 flex-col items-center px-4 pt-4 pb-8">
      <!-- Title + Date -->
      <div class="w-full max-w-lg mb-4 flex items-center justify-between">
        <h1 class="m-0 text-2xl font-bold bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">🏢 office</h1>
        <div class="flex items-center gap-3">
          <span class="text-slate-400 text-sm">{{ selectedDateLabel }}</span>
          <button
            v-if="selectedDateStr !== todayStr"
            class="text-xs text-sky-400 hover:text-sky-300 transition-colors"
            @click="goToToday"
          >今日に戻る</button>
        </div>
      </div>

      <!-- Non-office day message -->
      <div v-if="!isSelectedOfficeDay" class="flex-1 flex items-center justify-center w-full">
        <div class="text-center px-8">
          <div class="text-6xl mb-6">🏠</div>
          <p class="text-3xl font-bold text-slate-200 leading-snug">出社しなくて良い日です</p>
          <p class="mt-4 text-slate-500 text-base">ゆっくり休んでください 😊</p>
        </div>
      </div>

      <!-- Office day -->
      <div v-else class="w-full max-w-lg flex flex-col gap-3">
        <!-- 不/休 toggle -->
        <div class="flex gap-2">
          <button
            class="flex-1 py-1.5 rounded-lg font-bold text-sm transition-all border"
            :class="selectedRecord.dayType === 'fu'
              ? 'bg-amber-400/20 border-amber-400 text-amber-300'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-amber-400/50 hover:text-amber-400/70'"
            @click="toggleDayType('fu')"
          >
            <span class="mr-1">不</span><span class="text-xs font-normal">出社不要</span>
          </button>
          <button
            class="flex-1 py-1.5 rounded-lg font-bold text-sm transition-all border"
            :class="selectedRecord.dayType === 'kyu'
              ? 'bg-rose-400/20 border-rose-400 text-rose-300'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-rose-400/50 hover:text-rose-400/70'"
            @click="toggleDayType('kyu')"
          >
            <span class="mr-1">休</span><span class="text-xs font-normal">有休取得</span>
          </button>
        </div>

        <!-- Status when 不 or 休 is set -->
        <div v-if="selectedRecord.dayType" class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-lg text-center">
          <div class="text-5xl font-extrabold mb-2" :class="selectedRecord.dayType === 'fu' ? 'text-amber-400' : 'text-rose-400'">
            {{ selectedRecord.dayType === 'fu' ? '不' : '休' }}
          </div>
          <div class="text-slate-400 text-sm">{{ selectedRecord.dayType === 'fu' ? '出社不要の日として記録しました' : '有休取得として記録しました' }}</div>
        </div>

        <!-- Checklist (shown when no 不/休 set) -->
        <template v-else>
          <!-- Progress bar -->
          <div class="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <div class="text-right text-xs text-slate-500">{{ checkedCount }} / {{ checkItems.length }} 完了</div>

          <!-- Checklist card -->
          <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex flex-col gap-1.5">
            <div
              v-for="(item, i) in checkItems"
              :key="i"
              class="flex items-center gap-3 py-1.5 px-3 rounded-xl transition-all cursor-pointer select-none"
              :class="selectedRecord.checks[i] ? 'bg-sky-400/10' : 'hover:bg-white/[0.04]'"
              @click="toggleCheck(i)"
            >
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                :class="selectedRecord.checks[i] ? 'bg-sky-400 border-sky-400' : 'border-white/20'"
              >
                <svg v-if="selectedRecord.checks[i]" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span
                class="text-base font-medium transition-colors"
                :class="selectedRecord.checks[i] ? 'text-sky-300 line-through decoration-sky-400/50' : 'text-slate-200'"
              >{{ item.icon }} {{ item.label }}</span>
            </div>
          </div>
        </template>

        <!-- Comment -->
        <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col gap-2">
          <label class="text-sm text-slate-400 font-medium">💬 コメント</label>
          <textarea
            v-model="selectedRecord.comment"
            class="bg-transparent border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-sky-400/50 transition-colors"
            rows="3"
            placeholder="今日の一言メモ..."
            @input="debouncedSave"
          />
        </div>
      </div>
    </main>

    <!-- Mobile: Calendar view -->
    <div v-show="mobileView === 'calendar'" class="md:hidden w-full flex items-start justify-center px-4 pt-4 pb-8">
      <div class="w-full max-w-[420px]">
        <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col gap-4">
          <!-- Title -->
          <h1 class="m-0 text-xl font-bold text-center bg-gradient-to-br from-sky-400 to-indigo-500 bg-clip-text text-transparent">🏢 office</h1>

          <!-- Month navigation -->
          <div class="flex items-center justify-between">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl text-slate-300"
              @click="prevMonth"
            >‹</button>
            <span class="text-base font-semibold text-slate-100">{{ calYear }}年{{ calMonth }}月</span>
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl text-slate-300"
              @click="nextMonth"
            >›</button>
          </div>

          <!-- Calendar grid -->
          <div class="grid grid-cols-7 gap-1 text-center">
            <span
              v-for="(label, i) in ['日', '月', '火', '水', '木', '金', '土']"
              :key="label"
              class="text-[10px] font-medium py-1"
              :class="i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-500'"
            >{{ label }}</span>

            <span v-for="i in calStartOffset" :key="`mpad-${i}`" />

            <button
              v-for="day in calDaysInMonth"
              :key="day"
              class="aspect-square flex flex-col items-center justify-center rounded-xl text-xs transition-all active:scale-90 select-none"
              :class="[
                isCalSelected(day)
                  ? 'ring-2 ring-sky-400 bg-sky-400/15'
                  : isCalToday(day)
                    ? 'ring-1 ring-sky-400/60 bg-sky-400/10'
                    : 'hover:bg-white/[0.05]',
                isOfficeDay(calYear, calMonth, day) ? 'font-semibold' : 'text-slate-600',
              ]"
              @click="selectDayMobile(day)"
            >
              <span :class="getDayOfWeekColor(calYear, calMonth, day)">{{ day }}</span>
              <span
                v-if="getDayMark(calYear, calMonth, day)"
                class="text-[11px] leading-none mt-0.5"
                :class="getDayMarkColor(calYear, calMonth, day)"
              >{{ getDayMark(calYear, calMonth, day) }}</span>
            </button>
          </div>

          <!-- Legend -->
          <div class="flex flex-col gap-1.5 text-xs text-slate-500 border-t border-white/[0.05] pt-4">
            <div class="flex items-center gap-2"><span class="text-slate-200">○</span> 出社済み</div>
            <div class="flex items-center gap-2"><span class="text-amber-400 font-bold">不</span> 出社不要</div>
            <div class="flex items-center gap-2"><span class="text-rose-400 font-bold">休</span> 有休取得</div>
            <div class="flex items-center gap-2"><span class="text-indigo-400 font-semibold">火水木</span> 出社日</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: Detail view -->
    <div v-show="mobileView === 'detail'" class="md:hidden w-full flex flex-col items-center px-4 pt-4 pb-8">
      <!-- Back button + date -->
      <div class="w-full max-w-lg mb-4 flex items-center gap-2">
        <button
          class="flex items-center gap-1 text-sm text-sky-400 hover:text-sky-300 transition-colors"
          @click="mobileView = 'calendar'"
        >‹ カレンダー</button>
        <span class="flex-1 text-right text-slate-400 text-sm">{{ selectedDateLabel }}</span>
      </div>

      <!-- Non-office day message -->
      <div v-if="!isSelectedOfficeDay" class="flex-1 flex items-center justify-center w-full">
        <div class="text-center px-8">
          <div class="text-6xl mb-6">🏠</div>
          <p class="text-3xl font-bold text-slate-200 leading-snug">出社しなくて良い日です</p>
          <p class="mt-4 text-slate-500 text-base">ゆっくり休んでください 😊</p>
        </div>
      </div>

      <!-- Office day -->
      <div v-else class="w-full max-w-lg flex flex-col gap-3">
        <!-- 不/休 toggle -->
        <div class="flex gap-2">
          <button
            class="flex-1 py-1.5 rounded-lg font-bold text-sm transition-all border"
            :class="selectedRecord.dayType === 'fu'
              ? 'bg-amber-400/20 border-amber-400 text-amber-300'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-amber-400/50 hover:text-amber-400/70'"
            @click="toggleDayType('fu')"
          >
            <span class="mr-1">不</span><span class="text-xs font-normal">出社不要</span>
          </button>
          <button
            class="flex-1 py-1.5 rounded-lg font-bold text-sm transition-all border"
            :class="selectedRecord.dayType === 'kyu'
              ? 'bg-rose-400/20 border-rose-400 text-rose-300'
              : 'bg-white/[0.04] border-white/[0.08] text-slate-500 hover:border-rose-400/50 hover:text-rose-400/70'"
            @click="toggleDayType('kyu')"
          >
            <span class="mr-1">休</span><span class="text-xs font-normal">有休取得</span>
          </button>
        </div>

        <!-- Status when 不 or 休 is set -->
        <div v-if="selectedRecord.dayType" class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-lg text-center">
          <div class="text-5xl font-extrabold mb-2" :class="selectedRecord.dayType === 'fu' ? 'text-amber-400' : 'text-rose-400'">
            {{ selectedRecord.dayType === 'fu' ? '不' : '休' }}
          </div>
          <div class="text-slate-400 text-sm">{{ selectedRecord.dayType === 'fu' ? '出社不要の日として記録しました' : '有休取得として記録しました' }}</div>
        </div>

        <!-- Checklist (shown when no 不/休 set) -->
        <template v-else>
          <!-- Progress bar -->
          <div class="w-full bg-white/[0.06] rounded-full h-2 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-sky-400 to-indigo-500 rounded-full transition-all duration-500"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <div class="text-right text-xs text-slate-500">{{ checkedCount }} / {{ checkItems.length }} 完了</div>

          <!-- Checklist card -->
          <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 shadow-lg flex flex-col gap-1.5">
            <div
              v-for="(item, i) in checkItems"
              :key="i"
              class="flex items-center gap-3 py-1.5 px-3 rounded-xl transition-all cursor-pointer select-none"
              :class="selectedRecord.checks[i] ? 'bg-sky-400/10' : 'hover:bg-white/[0.04]'"
              @click="toggleCheck(i)"
            >
              <div
                class="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                :class="selectedRecord.checks[i] ? 'bg-sky-400 border-sky-400' : 'border-white/20'"
              >
                <svg v-if="selectedRecord.checks[i]" class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span
                class="text-base font-medium transition-colors"
                :class="selectedRecord.checks[i] ? 'text-sky-300 line-through decoration-sky-400/50' : 'text-slate-200'"
              >{{ item.icon }} {{ item.label }}</span>
            </div>
          </div>
        </template>

        <!-- Comment -->
        <div class="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-lg flex flex-col gap-2">
          <label class="text-sm text-slate-400 font-medium">💬 コメント</label>
          <textarea
            v-model="selectedRecord.comment"
            class="bg-transparent border border-white/[0.08] rounded-xl px-4 py-3 text-slate-200 text-sm placeholder-slate-600 resize-none focus:outline-none focus:border-sky-400/50 transition-colors"
            rows="3"
            placeholder="今日の一言メモ..."
            @input="debouncedSave"
          />
        </div>
      </div>
    </div>

    <!-- Auth modal -->
    <AuthModal v-if="showAuthModal" accent="sky" />

    <!-- Celebration popup -->
    <Transition name="celebrate">
      <div
        v-if="showCelebration"
        class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
        @click="showCelebration = false"
      >
        <div class="relative bg-gradient-to-br from-[#0f172a] to-[#1e293b] border border-sky-400/30 rounded-3xl p-8 max-w-sm mx-4 text-center shadow-[0_0_80px_rgba(56,189,248,0.3)] animate-[pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
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
import { ref, computed, onMounted } from 'vue'

useHead({ title: 'office — 出社記録' })

const $dev = import.meta.dev

// ── Types ──────────────────────────────────────────────────
type OfficeRecord = {
  date: string
  checks: boolean[]
  comment: string
  dayType: string | null
}

// ── Constants ──────────────────────────────────────────────
const OFFICE_DAYS = new Set([2, 3, 4])
const START_DATE = new Date(2026, 5, 1)

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

// ── Auth ───────────────────────────────────────────────────
const { isLoggedIn, checked, checkAuth } = useAuth()
const showAuthModal = computed(() => !$dev && !isLoggedIn.value && checked.value)

// ── State ──────────────────────────────────────────────────
const today = new Date()
const todayStr = today.toISOString().slice(0, 10)

const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth() + 1)
const selectedDateStr = ref(todayStr)
const mobileView = ref<'calendar' | 'detail'>('calendar')

const allRecords = ref<OfficeRecord[]>([])
const showCelebration = ref(false)
const celebrationTitle = ref('')
const celebrationMessage = ref('')
let saveTimer: ReturnType<typeof setTimeout> | null = null

// ── Selected date info ──────────────────────────────────────
const selectedDateObj = computed(() => new Date(selectedDateStr.value + 'T00:00:00'))

const isSelectedOfficeDay = computed(() => {
  const dow = selectedDateObj.value.getDay()
  return selectedDateObj.value >= START_DATE && OFFICE_DAYS.has(dow)
})

const selectedDateLabel = computed(() => {
  const d = selectedDateObj.value
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`
})

const selectedRecord = computed<OfficeRecord>(() => {
  let rec = allRecords.value.find(r => r.date === selectedDateStr.value)
  if (!rec) {
    rec = { date: selectedDateStr.value, checks: Array(7).fill(false), comment: '', dayType: null }
    allRecords.value.push(rec)
  }
  return rec
})

const checkedCount = computed(() => selectedRecord.value.checks.filter(Boolean).length)
const progressPercent = computed(() => (checkedCount.value / checkItems.length) * 100)

// ── Calendar ────────────────────────────────────────────────
const calDaysInMonth = computed(() => new Date(calYear.value, calMonth.value, 0).getDate())
const calStartOffset = computed(() => new Date(calYear.value, calMonth.value - 1, 1).getDay())

const prevMonth = () => {
  if (calMonth.value === 1) { calYear.value--; calMonth.value = 12 }
  else calMonth.value--
  fetchRecords()
}
const nextMonth = () => {
  if (calMonth.value === 12) { calYear.value++; calMonth.value = 1 }
  else calMonth.value++
  fetchRecords()
}

const selectDay = (day: number) => {
  const ds = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  selectedDateStr.value = ds
}

const selectDayMobile = (day: number) => {
  selectDay(day)
  mobileView.value = 'detail'
}

const goToToday = () => {
  calYear.value = today.getFullYear()
  calMonth.value = today.getMonth() + 1
  selectedDateStr.value = todayStr
  fetchRecords()
}

const isCalToday = (day: number) =>
  calYear.value === today.getFullYear() &&
  calMonth.value === today.getMonth() + 1 &&
  day === today.getDate()

const isCalSelected = (day: number) => {
  const ds = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return ds === selectedDateStr.value
}

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

const getDayMark = (y: number, m: number, d: number) => {
  const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const rec = allRecords.value.find(r => r.date === ds)
  if (!rec) return null
  if (rec.dayType === 'fu') return '不'
  if (rec.dayType === 'kyu') return '休'
  if (rec.checks.some(Boolean)) return '○'
  return null
}

const getDayMarkColor = (y: number, m: number, d: number) => {
  const ds = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const rec = allRecords.value.find(r => r.date === ds)
  if (!rec) return ''
  if (rec.dayType === 'fu') return 'text-amber-400 font-bold'
  if (rec.dayType === 'kyu') return 'text-rose-400 font-bold'
  return 'text-slate-200'
}

// ── Dev fallback ────────────────────────────────────────────
const DEV_KEY = 'office-records'
const loadDevRecords = (): OfficeRecord[] => {
  try { return JSON.parse(localStorage.getItem(DEV_KEY) ?? '[]') } catch { return [] }
}
const saveDevRecords = (recs: OfficeRecord[]) => {
  localStorage.setItem(DEV_KEY, JSON.stringify(recs))
}

// ── API ─────────────────────────────────────────────────────
const fetchRecords = async () => {
  if ($dev) {
    allRecords.value = loadDevRecords()
    return
  }
  if (!isLoggedIn.value) return
  try {
    const rows = await $fetch<OfficeRecord[]>('/api/office/records', {
      query: { year: calYear.value, month: calMonth.value },
    })
    const prefix = `${calYear.value}-${String(calMonth.value).padStart(2, '0')}`
    allRecords.value = [
      ...allRecords.value.filter(r => !r.date.startsWith(prefix)),
      ...rows,
    ]
  } catch {}
}

const saveRecord = async () => {
  const rec = selectedRecord.value
  if ($dev) {
    const all = loadDevRecords()
    const idx = all.findIndex(r => r.date === rec.date)
    if (idx >= 0) all[idx] = rec
    else all.push(rec)
    saveDevRecords(all)
    return
  }
  if (!isLoggedIn.value) return
  try {
    await $fetch(`/api/office/records/${rec.date}`, {
      method: 'PUT',
      body: { checks: rec.checks, comment: rec.comment, dayType: rec.dayType },
    })
  } catch {}
}

const debouncedSave = () => {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(saveRecord, 600)
}

// ── Checklist ────────────────────────────────────────────────
const toggleCheck = async (i: number) => {
  selectedRecord.value.checks[i] = !selectedRecord.value.checks[i]
  await saveRecord()
  if (selectedRecord.value.checks.every(Boolean)) triggerCelebration()
}

const toggleDayType = async (type: 'fu' | 'kyu') => {
  selectedRecord.value.dayType = selectedRecord.value.dayType === type ? null : type
  await saveRecord()
}

const triggerCelebration = () => {
  const pick = CELEBRATIONS[Math.floor(Math.random() * CELEBRATIONS.length)]
  celebrationTitle.value = pick.title
  celebrationMessage.value = pick.message
  showCelebration.value = true
}

onMounted(async () => {
  if (!$dev) await checkAuth()
  await fetchRecords()
})
</script>

<style scoped>
.celebrate-enter-active { transition: opacity 0.3s ease; }
.celebrate-leave-active { transition: opacity 0.2s ease; }
.celebrate-enter-from,
.celebrate-leave-to { opacity: 0; }

@keyframes pop {
  from { transform: scale(0.7); opacity: 0; }
  to   { transform: scale(1);   opacity: 1; }
}
@keyframes wiggle {
  0%, 100% { transform: rotate(-15deg) scale(1.1); }
  50%       { transform: rotate(15deg) scale(1.3); }
}
</style>
