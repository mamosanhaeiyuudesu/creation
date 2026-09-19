<template>
  <div class="max-w-[960px] mx-auto px-4 sm:px-6 pt-6 pb-20">
    <!-- 見出し -->
    <header class="flex items-start justify-between gap-3 mb-5">
      <div>
        <h1 class="nk-serif m-0 text-[26px] leading-none">nikki</h1>
        <p class="hidden sm:block mt-2 mb-0 text-[12.5px] text-[var(--nk-ink-soft)] leading-relaxed">
          カレンダーの日を選んで、話すか書くかするだけ。
          あとで読み返したときに手応えの残ることだけを拾って並べます。
        </p>
      </div>
      <div v-if="isLoggedIn" class="flex items-center gap-2 shrink-0">
        <button class="nk-btn-ghost !w-9 !px-0 justify-center text-[15px]" title="Googleカレンダーの設定" @click="showSetup = !showSetup">⚙</button>
        <button class="nk-btn-ghost !h-9 !px-3 !text-[12px]" @click="showPasswordModal = true">パスワード</button>
        <button class="nk-btn-ghost !h-9 !px-3 !text-[12px]" @click="logout">ログアウト</button>
      </div>
    </header>

    <template v-if="isLoggedIn">
      <p v-if="error" class="nk-card px-4 py-2.5 mb-4 text-[12.5px] text-[var(--nk-today)]">{{ error }}</p>

      <!-- 初期設定。連携が済んでいない／カレンダーを選んでいないあいだは出したままにする -->
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

      <!-- スマホは画面が狭いのでタブで切り替え。PCは常に両方並べて表示する -->
      <div class="flex gap-2 mb-4 sm:hidden">
        <button
          class="flex-1"
          :class="mobileView === 'calendar' ? 'nk-btn' : 'nk-btn-ghost'"
          @click="mobileView = 'calendar'"
        >カレンダー</button>
        <button
          class="flex-1"
          :class="mobileView === 'timeline' ? 'nk-btn' : 'nk-btn-ghost'"
          @click="mobileView = 'timeline'"
        >これまでの日々</button>
      </div>

      <div class="flex flex-col gap-6">
        <div :class="mobileView === 'calendar' ? '' : 'hidden sm:block'">
          <NikkiMonthCalendar
            :month="month"
            :marks="marks"
            :events="monthEvents"
            :today="today"
            :selected="selectedDate"
            :loading="monthLoading"
            :has-calendars="status.calendarIds.length > 0"
            @select="openDay"
            @shift="shiftMonth"
            @go-today="month = today.slice(0, 7)"
          />
        </div>

        <div :class="mobileView === 'timeline' ? '' : 'hidden sm:block'">
          <NikkiTimeline
            :days="days"
            :has-more="hasMore"
            :loading="timelineLoading"
            :today="today"
            :on-load-older="loadOlder"
            @select="openDay"
          />
        </div>
      </div>

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
        @close="closeDay"
        @save="onSave"
        @reextract="reextract"
        @patch-topic="patchTopic"
        @remove-topic="removeTopic"
      />
    </template>

    <AuthModal v-if="showAuthModal" accent="sky" />
    <PasswordModal v-model:show="showPasswordModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { useNikki } from '~/composables/nikki/useNikki'

definePageMeta({ layout: 'nikki' })
useHead({
  title: 'nikki — その日の手応えを残す日記',
  link: [
    {
      key: 'icon',
      rel: 'icon',
      type: 'image/svg+xml',
      href: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📔</text></svg>`,
    },
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
  patchTopic,
  removeTopic,
} = useNikki()

const showAuthModal = computed(() => !isLoggedIn.value && checked.value)
const showPasswordModal = ref(false)
const showSetup = ref(false)
// スマホ用タブ（PCでは使わず常に両方表示）
const mobileView = ref<'calendar' | 'timeline'>('calendar')
const dismissedSetup = ref(false)
const savingSetup = ref(false)
const savedTick = ref(0)

// 連携が未完了（未連携、または連携済みだがカレンダー未選択）なら、開くたびに設定を出す。
// ただし閉じられるようにする＝連携せずに日記だけ使う人に出し続けない（次に開くとまた出る）。
const setupIncomplete = computed(() => !status.value.connected || !status.value.calendarIds.length)
const setupVisible = computed(() => showSetup.value || (setupIncomplete.value && !dismissedSetup.value))

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
