<template>
  <div class="flex items-start justify-center px-4 pt-4 lg:pt-8 min-h-full pb-8">
    <div class="relative w-full max-w-[420px] ml-2.5">
      <div class="absolute inset-x-0 top-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-rose-400 to-pink-600 z-10" />
      <div class="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35),0_0_40px_rgba(244,63,94,0.06)] backdrop-blur-[10px] grid gap-5">

        <template v-if="showApp">
          <!-- Header -->
          <header class="relative flex items-center justify-center">
            <div class="text-center">
              <h1 class="m-0 text-[clamp(22px,4vw,28px)] font-bold bg-gradient-to-br from-rose-400 to-pink-500 bg-clip-text text-transparent">💑 marriage</h1>
              <p class="mt-1 mb-0 text-slate-400 text-sm">ふたりの日々を記録する</p>
            </div>
            <div class="absolute right-0 top-1/2 -translate-y-1/2">
              <UserMenu
                v-if="!$dev && user"
                :username="user.username"
                :items="menuItems"
                accentFrom="#f43f5e"
                accentTo="#db2777"
              />
            </div>
          </header>

          <!-- Month navigation -->
          <div class="flex items-center justify-between">
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl text-slate-300 leading-none"
              @click="prevMonth"
            >‹</button>
            <h2 class="m-0 text-base font-semibold text-slate-100">
              {{ currentYear }}年{{ currentMonth }}月
            </h2>
            <button
              class="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl text-slate-300 leading-none"
              @click="nextMonth"
            >›</button>
          </div>

          <!-- Calendar grid -->
          <div class="grid grid-cols-7 gap-1">
            <div
              v-for="(label, i) in ['日', '月', '火', '水', '木', '金', '土']"
              :key="label"
              class="text-center text-xs py-1.5 font-medium"
              :class="i === 0 ? 'text-rose-400' : i === 6 ? 'text-sky-400' : 'text-slate-500'"
            >{{ label }}</div>

            <div v-for="i in startOffset" :key="`pad-${i}`" class="aspect-square" />

            <button
              v-for="day in daysInMonth"
              :key="day"
              class="aspect-square flex flex-col items-center justify-center rounded-xl transition-all active:scale-90 select-none"
              :class="[
                getDayRecord(day) ? 'bg-white/[0.07]' : 'hover:bg-white/[0.05]',
                isToday(day) ? 'ring-1 ring-rose-400/60' : '',
              ]"
              @click="openModal(day)"
            >
              <span
                class="text-[11px] leading-none font-medium"
                :class="getDayOfWeekClass(day)"
              >{{ day }}</span>
              <span v-if="getDayRecord(day)" class="text-[18px] leading-none mt-0.5">
                {{ moodEmoji(getDayRecord(day)!.mood) }}
              </span>
            </button>
          </div>

          <!-- Legend -->
          <div class="flex justify-center gap-5 text-xs text-slate-500">
            <span>😊 良かった</span>
            <span>😐 ふつう</span>
            <span>😔 悪かった</span>
          </div>
        </template>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="rose" />

    <!-- Input Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="modal.open"
          class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50"
          @click.self="closeModal"
        >
          <div class="w-full max-w-[400px] bg-[#1e293b] border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl p-6">
            <div class="text-center mb-5">
              <p class="text-xs text-slate-500">{{ currentYear }}年{{ currentMonth }}月</p>
              <h3 class="text-2xl font-bold text-slate-100 mt-0.5">{{ modal.day }}日</h3>
            </div>

            <div class="flex gap-2 mb-4">
              <button
                v-for="m in moods"
                :key="m.value"
                class="flex-1 flex flex-col items-center gap-1.5 py-4 rounded-xl border-2 transition-all"
                :class="modal.mood === m.value ? m.activeClass : 'border-white/10 bg-white/[0.04] text-slate-500 hover:bg-white/10'"
                @click="modal.mood = m.value"
              >
                <span class="text-3xl">{{ m.emoji }}</span>
                <span class="text-xs font-medium">{{ m.label }}</span>
              </button>
            </div>

            <textarea
              v-model="modal.comment"
              placeholder="コメント（任意）"
              rows="2"
              class="w-full bg-white/[0.05] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-white/20 transition-colors resize-none font-[inherit]"
            />

            <div class="flex gap-2 mt-4">
              <button
                class="flex-1 py-3 rounded-xl text-white text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 bg-gradient-to-br from-rose-400 to-pink-600"
                :disabled="!modal.mood || isSaving"
                @click="saveRecord"
              >
                {{ isSaving ? '保存中...' : '保存' }}
              </button>
              <button
                class="px-4 py-3 rounded-xl bg-white/[0.05] border border-white/10 text-slate-400 text-sm hover:bg-white/10 transition-colors"
                @click="closeModal"
              >
                閉じる
              </button>
              <button
                v-if="modal.hasRecord"
                class="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors disabled:opacity-40"
                :disabled="isSaving"
                @click="deleteRecord"
              >
                削除
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: import.meta.dev ? 'marriage (dev)' : 'marriage',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💑</text></svg>` },
    { rel: 'manifest', href: '/manifest-marriage.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-marriage.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'marriage' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'theme-color', content: '#db2777' },
  ],
})

interface MarriageRecord {
  date: string
  mood: string
  comment: string
}

const $dev = import.meta.dev
const DEV_STORAGE_KEY = 'marriage-records-dev'

const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

const showAuthModal = computed(() => !$dev && !isLoggedIn.value && checked.value)
const showApp = computed(() => $dev || isLoggedIn.value)

// dev mode: localStorage helpers
const loadAllDevRecords = (): MarriageRecord[] => {
  if (!import.meta.client) return []
  try { return JSON.parse(localStorage.getItem(DEV_STORAGE_KEY) ?? '[]') } catch { return [] }
}
const saveAllDevRecords = (recs: MarriageRecord[]) => {
  if (import.meta.client) localStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(recs))
}

const today = new Date()
const currentYear = ref(today.getFullYear())
const currentMonth = ref(today.getMonth() + 1)
const records = ref<MarriageRecord[]>([])

const moods = [
  { value: 'good', emoji: '😊', label: '良かった', activeClass: 'border-emerald-400 bg-emerald-400/10 text-emerald-300' },
  { value: 'normal', emoji: '😐', label: 'ふつう', activeClass: 'border-slate-300 bg-slate-300/10 text-slate-200' },
  { value: 'bad', emoji: '😔', label: '悪かった', activeClass: 'border-rose-400 bg-rose-400/10 text-rose-300' },
]

const daysInMonth = computed(() => new Date(currentYear.value, currentMonth.value, 0).getDate())
const startOffset = computed(() => new Date(currentYear.value, currentMonth.value - 1, 1).getDay())

const getDateStr = (day: number) => {
  const m = String(currentMonth.value).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${currentYear.value}-${m}-${d}`
}

const getDayRecord = (day: number) => records.value.find(r => r.date === getDateStr(day)) ?? null

const isToday = (day: number) =>
  today.getFullYear() === currentYear.value &&
  today.getMonth() + 1 === currentMonth.value &&
  today.getDate() === day

const getDayOfWeekClass = (day: number) => {
  const dow = new Date(currentYear.value, currentMonth.value - 1, day).getDay()
  if (dow === 0) return 'text-rose-400'
  if (dow === 6) return 'text-sky-400'
  return 'text-slate-400'
}

const moodEmoji = (mood: string) => moods.find(m => m.value === mood)?.emoji ?? ''

const fetchRecords = async () => {
  if ($dev) {
    const m = String(currentMonth.value).padStart(2, '0')
    const prefix = `${currentYear.value}-${m}`
    records.value = loadAllDevRecords().filter(r => r.date.startsWith(prefix))
    return
  }
  if (!isLoggedIn.value) return
  try {
    records.value = await $fetch<MarriageRecord[]>(
      `/api/marriage/records?year=${currentYear.value}&month=${currentMonth.value}`
    )
  } catch {
    records.value = []
  }
}

const prevMonth = () => {
  if (currentMonth.value === 1) { currentYear.value--; currentMonth.value = 12 }
  else currentMonth.value--
}

const nextMonth = () => {
  if (currentMonth.value === 12) { currentYear.value++; currentMonth.value = 1 }
  else currentMonth.value++
}

const modal = ref({ open: false, day: 0, mood: '', comment: '', hasRecord: false })
const isSaving = ref(false)

const openModal = (day: number) => {
  const existing = getDayRecord(day)
  modal.value = { open: true, day, mood: existing?.mood ?? '', comment: existing?.comment ?? '', hasRecord: !!existing }
}

const closeModal = () => { modal.value.open = false }

const saveRecord = async () => {
  if (!modal.value.mood) return
  isSaving.value = true
  try {
    const date = getDateStr(modal.value.day)
    const saved: MarriageRecord = { date, mood: modal.value.mood, comment: modal.value.comment }

    if ($dev) {
      const all = loadAllDevRecords()
      const idx = all.findIndex(r => r.date === date)
      if (idx >= 0) all[idx] = saved
      else all.push(saved)
      saveAllDevRecords(all)
      const ri = records.value.findIndex(r => r.date === date)
      if (ri >= 0) records.value[ri] = saved
      else records.value.push(saved)
    } else {
      const result = await $fetch<MarriageRecord>(`/api/marriage/records/${date}`, {
        method: 'PUT',
        body: { mood: modal.value.mood, comment: modal.value.comment },
      })
      const idx = records.value.findIndex(r => r.date === date)
      if (idx >= 0) records.value[idx] = result
      else records.value.push(result)
    }
    closeModal()
  } finally {
    isSaving.value = false
  }
}

const deleteRecord = async () => {
  isSaving.value = true
  try {
    const date = getDateStr(modal.value.day)
    if ($dev) {
      saveAllDevRecords(loadAllDevRecords().filter(r => r.date !== date))
    } else {
      await $fetch(`/api/marriage/records/${date}`, { method: 'DELETE' })
    }
    records.value = records.value.filter(r => r.date !== date)
    closeModal()
  } finally {
    isSaving.value = false
  }
}

const menuItems = [
  { icon: '🚪', label: 'ログアウト', action: logout },
]

watch([currentYear, currentMonth], fetchRecords)

onMounted(async () => {
  if (!$dev) await checkAuth()
  fetchRecords()
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.25s ease;
}
.modal-enter-from > div,
.modal-leave-to > div {
  transform: translateY(16px);
}
</style>
