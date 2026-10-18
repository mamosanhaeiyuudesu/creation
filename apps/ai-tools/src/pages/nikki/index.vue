<template>
  <div class="min-h-[100dvh] flex flex-col">
    <!-- まなびと同じ、細いヘッダー（名前だけ。操作は右端に小さく） -->
    <header class="shrink-0 flex items-center justify-between px-4 sm:px-6 h-14">
      <span class="nk-serif text-[15px] !font-black text-[var(--nk-today)]">日記</span>
      <div v-if="isLoggedIn" class="flex items-center gap-1 shrink-0">
        <button class="nk-btn-ghost !border-transparent !bg-transparent !w-9 !px-0 justify-center text-[15px]" title="Googleカレンダーの設定" @click="showSetup = !showSetup">⚙</button>
        <button class="nk-btn-ghost !border-transparent !bg-transparent !h-9 !px-3 !text-[12px]" @click="showPasswordModal = true">パスワード</button>
        <button class="nk-btn-ghost !border-transparent !bg-transparent !h-9 !px-3 !text-[12px]" @click="logout">ログアウト</button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-[600px] mx-auto px-4 sm:px-6 pb-20">
    <template v-if="isLoggedIn">
      <p v-if="error" class="nk-card px-4 py-2.5 mb-4 text-[12.5px] text-[var(--nk-today)]">{{ error }}</p>

      <!-- 連携が済んでいない／カレンダーを選んでいないあいだは、1行の小さな案内だけ出す（詳細は押したときに開く） -->
      <div
        v-if="setupHintVisible"
        class="mb-3 -mt-1 flex items-center gap-2 text-[11.5px] text-[var(--nk-ink-soft)]"
      >
        <span class="truncate">📅 {{ status.connected ? '表示するカレンダーを選ぶと、予定が見られます' : 'Googleカレンダーと連携すると、予定が見られます' }}</span>
        <button class="shrink-0 font-bold text-[var(--nk-ink)] underline underline-offset-2" @click="showSetup = true">
          {{ status.connected ? '選ぶ' : '設定' }}
        </button>
        <button class="shrink-0 ml-auto px-1" aria-label="案内を閉じる" @click="dismissedSetup = true">×</button>
      </div>

      <!-- 設定の本体。⚙ か上の案内から開く -->
      <div v-if="setupVisible" class="mb-4">
        <NikkiSetup
          :status="status"
          :calendars="calendars"
          :saving="savingSetup"
          :closable="true"
          @save="onSaveCalendars"
          @disconnect="onDisconnect"
          @close="closeSetup"
        />
      </div>

      <!-- 記録の入口：今日／昨日の記録と、カレンダー（ポップオーバー） -->
      <div class="relative mb-5">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="t in quickDays"
            :key="t.date"
            class="flex-1 sm:flex-none sm:min-w-[170px]"
            :class="t.recorded ? ['nk-btn-ghost', t.ghost] : ['nk-btn', t.solid]"
            @click="openDay(t.date)"
          >
            <span v-if="t.recorded" class="text-[var(--nk-gold)] mr-1">✓</span>{{ t.label }}
          </button>
          <button
            class="nk-btn-ghost flex-1 sm:flex-none"
            :class="showCalendar ? '!border-[var(--nk-indigo)]' : ''"
            :aria-expanded="showCalendar"
            @click="showCalendar = !showCalendar"
          >📅 カレンダー</button>
        </div>

        <template v-if="showCalendar">
          <!-- 外側タップで閉じる -->
          <div class="fixed inset-0 z-30" @click="showCalendar = false" />
          <div class="absolute left-0 right-0 sm:right-auto sm:w-[560px] top-full mt-2 z-40 shadow-[0_12px_36px_rgba(34,37,44,0.18)] rounded-xl">
            <NikkiMonthCalendar
              :month="month"
              :marks="marks"
              :events="monthEvents"
              :today="today"
              :selected="selectedDate"
              :loading="monthLoading"
              :has-calendars="status.calendarIds.length > 0"
              @select="onPickFromCalendar"
              @shift="shiftMonth"
              @go-today="month = today.slice(0, 7)"
            />
          </div>
        </template>
      </div>

      <!-- これまでの日々（メイン） -->
      <NikkiTimeline
        :days="days"
        :has-more="hasMore"
        :loading="timelineLoading"
        :today="today"
        :on-load-older="loadOlder"
        @select="openDay"
      />

      <!-- 頭の中（ワードクラウド）は一旦非表示。復活させるときは import / useNikkiBrainWords / このブロックを戻す
      <div class="shrink-0 w-[300px]"><NikkiBrainCloud :words="brainWords" /></div>
      -->

      <NikkiDayPanel
        v-if="selectedDate"
        :date="selectedDate"
        :today="today"
        :entry="entry"
        :events="dayEvents"
        :loading="dayLoading"
        :saving="saving"
        :error="error"
        :saved-tick="savedTick"
        :prev-date="dayNavPrev"
        :next-date="dayNavNext"
        @close="closeDay"
        @save="onSave"
        @reextract="reextract"
        @add-topic="addTopic"
        @patch-topic="patchTopic"
        @remove-topic="removeTopic"
        @navigate="openDay"
      />
    </template>

    </main>

    <AuthModal v-if="showAuthModal" accent="sky" />
    <PasswordModal v-model:show="showPasswordModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { useNikki } from '~/composables/nikki/useNikki'
// import { useNikkiBrainWords } from '~/composables/nikki/useNikkiBrainWords'
import { prevDate, nextDate } from '~/utils/nikki-calendar'
import NikkiTimeline from '~/components/nikki/NikkiTimeline.vue'
// import NikkiBrainCloud from '~/components/nikki/NikkiBrainCloud.vue'

definePageMeta({ layout: 'nikki' })
useHead({
  title: '日記 — その日の手応えを残す',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/icon-nikki.svg' },
    { rel: 'manifest', href: '/manifest-nikki.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-nikki.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: '日記' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'theme-color', content: '#f7f5ef' },
  ],
})

const route = useRoute()
const { user, isLoggedIn, checked, checkAuth, logout } = useAuth()

const {
  status,
  calendars,
  month,
  marks,
  monthEvents,
  monthLoading,
  days,
  timelineLoading,
  hasMore,
  selectedDate,
  entry,
  dayEvents,
  dayLoading,
  saving,
  error,
  today,
  loadStatus,
  loadCalendars,
  saveCalendars,
  disconnect,
  loadMonth,
  shiftMonth,
  loadTimeline,
  loadOlder,
  openDay,
  closeDay,
  saveText,
  reextract,
  addTopic,
  patchTopic,
  removeTopic,
} = useNikki()

const showAuthModal = computed(() => !isLoggedIn.value && checked.value)

const dayNavPrev = computed(() => (selectedDate.value ? prevDate(selectedDate.value) : undefined))

const dayNavNext = computed(() => {
  if (!selectedDate.value) return undefined
  const next = nextDate(selectedDate.value)
  return next <= today.value ? next : undefined
})
const showPasswordModal = ref(false)
const showSetup = ref(false)
const showCalendar = ref(false)

// 頭の中（ワードクラウド）は一旦非表示
// const { words: brainWords } = useNikkiBrainWords(days)

// 今日／昨日のボタン。記録済み（タイムラインにある日、または表示中の月の印がある日）は「追記」表示にする
const isRecorded = (date: string) => days.value.some((d) => d.date === date) || marks.value.includes(date)
const quickDays = computed(() => {
  const todayStr = today.value
  const yesterday = prevDate(todayStr)
  return [
    { date: todayStr, label: isRecorded(todayStr) ? '今日の記録（追記）' : '今日の記録', recorded: isRecorded(todayStr), solid: '', ghost: '!border-[var(--nk-accent)]' },
    { date: yesterday, label: isRecorded(yesterday) ? '昨日の記録（追記）' : '昨日の記録', recorded: isRecorded(yesterday), solid: '!bg-[var(--nk-indigo)]', ghost: '!border-[var(--nk-indigo)]' },
  ]
})

const onPickFromCalendar = (date: string) => {
  showCalendar.value = false
  openDay(date)
}

const dismissedSetup = ref(false)
const savingSetup = ref(false)
const savedTick = ref(0)

// 連携が未完了（未連携、または連携済みだがカレンダー未選択）なら、開くたびに設定を出す。
// ただし閉じられるようにする＝連携せずに日記だけ使う人に出し続けない（次に開くとまた出る）。
const setupIncomplete = computed(() => !status.value.connected || !status.value.calendarIds.length)
const setupVisible = computed(() => showSetup.value)
// サーバー側の連携設定が無いときは案内しても進めないので出さない
const setupHintVisible = computed(
  () => !showSetup.value && setupIncomplete.value && !dismissedSetup.value && status.value.configured
)

const closeSetup = () => {
  showSetup.value = false
  dismissedSetup.value = true
}

const onSaveCalendars = async (ids: string[]) => {
  savingSetup.value = true
  await saveCalendars(ids)
  savingSetup.value = false
  showSetup.value = false
}

const onDisconnect = async () => {
  if (!confirm('Googleカレンダーの連携を解除します。日記の記録は残ります。よろしいですか？')) return
  savingSetup.value = true
  await disconnect()
  savingSetup.value = false
}

const onSave = async (text: string, extract: boolean) => {
  if (await saveText(text, extract)) savedTick.value++
}

const load = async () => {
  await loadStatus()
  await Promise.all([loadMonth(), loadTimeline()])
  if (status.value.connected) await loadCalendars()
}

watch(month, loadMonth)
// ログイン直後にそのまま使い始められるように、ログイン成立で読み込む
watch(isLoggedIn, (v) => { if (v) load() })

onMounted(async () => {
  if (route.query.nikki_error) error.value = String(route.query.nikki_error)
  // 連携のコールバックから戻ったときはカレンダー選択を開いた状態にする
  if (route.query.nikki_setup) showSetup.value = true
  await checkAuth()
  if (isLoggedIn.value) await load()
})
</script>
