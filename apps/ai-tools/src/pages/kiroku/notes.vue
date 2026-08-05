<template>
  <div class="min-h-[100dvh] flex flex-col">
    <header class="sticky top-0 z-20 flex items-center gap-1 px-3 sm:px-5 h-14 bg-[var(--kr-paper)]/90 backdrop-blur border-b border-[var(--kr-line)]">
      <NuxtLink to="/kiroku" class="kr-icon-btn" aria-label="書く画面へ">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </NuxtLink>
      <h1 class="kr-display text-[15px] text-[var(--kr-ink-soft)]">記録</h1>

      <div class="ml-auto flex items-center gap-0.5">
        <button class="kr-icon-btn" :class="{ 'kr-icon-btn--on': searchOpen }" aria-label="探す" @click="toggleSearch">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <circle cx="11" cy="11" r="6.2" />
            <path d="M15.6 15.6L20 20" />
          </svg>
        </button>
        <button class="kr-icon-btn" :class="{ 'kr-icon-btn--on': calendarOpen }" aria-label="カレンダー" @click="calendarOpen = !calendarOpen">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <rect x="3.75" y="5.25" width="16.5" height="15" rx="2.5" />
            <path d="M3.75 9.75h16.5M8 3.5v3.5M16 3.5v3.5" />
          </svg>
        </button>
        <button class="kr-icon-btn" :aria-label="isDark() ? '明るい表示にする' : '暗い表示にする'" @click="toggle">
          <svg v-if="isDark()" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <circle cx="12" cy="12" r="4.2" />
            <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
          </svg>
          <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
          </svg>
        </button>
      </div>
    </header>

    <div class="w-full max-w-[640px] mx-auto px-4 sm:px-6 pb-16 flex-1">
      <!-- 探す -->
      <div v-if="searchOpen" class="pt-3 kr-fade-in">
        <input ref="searchEl" v-model="query" class="kr-input" type="search" placeholder="ことばで探す" />
      </div>

      <!-- カレンダー：記録した日に印がつくだけ。書かなかった日は何も強調しない。 -->
      <div v-if="calendarOpen" class="kr-card mt-3 px-3 py-3 kr-fade-in">
        <div class="flex items-center justify-between px-1">
          <button class="kr-icon-btn" aria-label="前の月" @click="shiftMonth(-1)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14.5 6l-6 6 6 6" />
            </svg>
          </button>
          <span class="kr-display text-[14px]">{{ calYear }}年{{ calMonth + 1 }}月</span>
          <button class="kr-icon-btn" aria-label="次の月" :disabled="isCurrentMonth" :class="{ 'opacity-25 pointer-events-none': isCurrentMonth }" @click="shiftMonth(1)">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9.5 6l6 6-6 6" />
            </svg>
          </button>
        </div>

        <div class="mt-1.5 grid grid-cols-7 gap-y-0.5 text-center">
          <div v-for="w in WEEKDAYS" :key="w" class="text-[10.5px] text-[var(--kr-ink-faint)] py-1">{{ w }}</div>
          <div v-for="(cell, i) in calendarCells" :key="i" class="py-0.5">
            <button
              v-if="cell"
              class="w-8 h-8 mx-auto rounded-full flex flex-col items-center justify-center transition-colors"
              :class="[
                cell.key === selectedDay ? 'bg-[var(--kr-accent)] text-[var(--kr-paper)]' : cell.marked ? 'text-[var(--kr-ink)] hover:bg-[var(--kr-accent-soft)]' : 'text-[var(--kr-ink-faint)]',
                cell.isToday && cell.key !== selectedDay ? 'ring-1 ring-[var(--kr-line-strong)]' : '',
              ]"
              :disabled="!cell.marked"
              @click="pickDay(cell.key)"
            >
              <span class="text-[12.5px] leading-none">{{ cell.day }}</span>
              <span class="mt-1 w-1 h-1 rounded-full" :class="cell.marked ? (cell.key === selectedDay ? 'bg-[var(--kr-paper)]' : 'bg-[var(--kr-accent)]') : 'bg-transparent'" />
            </button>
          </div>
        </div>
      </div>

      <!-- 絞り込み中の表示 -->
      <div v-if="selectedDay" class="mt-3 flex items-center gap-2">
        <span class="text-[12.5px] text-[var(--kr-ink-soft)]">{{ selectedDayLabel }} の記録</span>
        <button class="text-[12px] text-[var(--kr-ink-faint)] hover:text-[var(--kr-ink-soft)] underline underline-offset-2" @click="selectedDay = ''">すべて表示</button>
      </div>

      <!-- 一覧 -->
      <div v-if="loaded" class="mt-4">
        <div v-if="total === 0" class="py-20 text-center kr-fade-in">
          <p class="kr-display text-[15px] text-[var(--kr-ink-soft)]">まだ記録はありません</p>
          <p class="mt-3 text-[12.5px] text-[var(--kr-ink-faint)] leading-relaxed">書いたものは、この端末の中だけに残ります。</p>
          <NuxtLink to="/kiroku" class="kr-btn-quiet inline-flex items-center mt-6">書いてみる</NuxtLink>
        </div>

        <p v-else-if="visible.length === 0" class="py-16 text-center text-[13px] text-[var(--kr-ink-faint)]">
          見あたりませんでした。
        </p>

        <section v-for="group in groups" :key="group.key" class="mb-6">
          <h2 class="kr-display text-[12.5px] text-[var(--kr-ink-faint)] px-1 pb-2">{{ group.label }}</h2>
          <ul class="space-y-2.5">
            <li v-for="note in group.notes" :key="note.id" class="kr-card px-4 py-3">
              <!-- 編集中 -->
              <template v-if="editingId === note.id">
                <textarea
                  ref="editEl"
                  v-model="editText"
                  class="kr-write !text-[15px] !leading-[1.95] !bg-[var(--kr-paper-2)] rounded-lg px-3 py-2"
                  rows="4"
                  @input="autoGrow"
                />
                <div class="mt-2 flex justify-end gap-1.5">
                  <button class="kr-btn-quiet" @click="cancelEdit">やめる</button>
                  <button class="kr-btn-quiet !border-[var(--kr-accent)] !text-[var(--kr-accent-deep)]" :disabled="!editText.trim()" @click="commitEdit(note.id)">保存</button>
                </div>
              </template>

              <!-- 表示 -->
              <template v-else>
                <button class="w-full text-left" @click="toggleExpand(note.id)">
                  <div class="text-[11px] text-[var(--kr-ink-faint)] mb-1.5">
                    {{ formatTime(note.createdAt) }}
                    <span v-if="note.updatedAt" class="ml-1.5">編集済み</span>
                  </div>
                  <p class="kr-body" :class="expandedId === note.id ? '' : 'line-clamp-3'">{{ note.text }}</p>
                </button>
                <div v-if="expandedId === note.id" class="mt-2.5 flex justify-end gap-3 text-[12px] text-[var(--kr-ink-faint)]">
                  <button class="hover:text-[var(--kr-ink-soft)] transition-colors" @click="startEdit(note)">編集</button>
                  <button class="hover:text-[var(--kr-ink-soft)] transition-colors" @click="askDelete(note)">削除</button>
                </div>
              </template>
            </li>
          </ul>
        </section>

        <!-- 足跡と、セッションで読み返すための持ち出し -->
        <footer v-if="total > 0" class="pt-6 pb-2 text-center border-t border-[var(--kr-line)]">
          <p class="text-[12.5px] text-[var(--kr-ink-soft)]">これまで {{ total }} の気づき</p>
          <button class="kr-btn-quiet mt-4" @click="openExport">まとめてコピー</button>
          <p class="mt-5 text-[11px] text-[var(--kr-ink-faint)] leading-relaxed">
            記録はこの端末の中だけに保存されます。<br />ブラウザのデータを消すと記録も消えます。
          </p>
        </footer>
      </div>

      <p v-if="storageError" class="mt-4 text-center text-[12px] text-[var(--kr-ink-soft)]">{{ storageError }}</p>
    </div>

    <!-- 削除の確認 -->
    <div v-if="deleteTarget" class="fixed inset-0 z-30 grid place-items-center px-6 bg-black/35 kr-fade-in" @click.self="deleteTarget = null">
      <div class="kr-card w-full max-w-[340px] px-5 py-5">
        <p class="text-[14px]">この記録を削除しますか？</p>
        <p class="mt-2 text-[12px] text-[var(--kr-ink-soft)] leading-relaxed">削除すると元に戻せません。</p>
        <p class="mt-3 px-3 py-2 rounded-lg bg-[var(--kr-paper-2)] text-[12.5px] text-[var(--kr-ink-soft)] line-clamp-3 kr-body">{{ deleteTarget.text }}</p>
        <div class="mt-4 flex justify-end gap-1.5">
          <button class="kr-btn-quiet" @click="deleteTarget = null">やめる</button>
          <button class="kr-btn-quiet !border-[var(--kr-line-strong)] !text-[var(--kr-ink)]" @click="confirmDelete">削除する</button>
        </div>
      </div>
    </div>

    <!-- まとめてコピー -->
    <div v-if="exportOpen" class="fixed inset-0 z-30 grid place-items-center px-6 bg-black/35 kr-fade-in" @click.self="exportOpen = false">
      <div class="kr-card w-full max-w-[360px] px-5 py-5">
        <p class="kr-display text-[14px]">まとめてコピー</p>
        <p class="mt-2 text-[12px] text-[var(--kr-ink-soft)] leading-relaxed">選んだ期間の記録を、ひと続きのテキストにします。</p>
        <div class="mt-3.5 space-y-1.5">
          <button
            v-for="opt in exportOptions"
            :key="opt.value"
            class="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border transition-colors text-left"
            :class="exportRange === opt.value ? 'border-[var(--kr-accent)] bg-[var(--kr-accent-soft)]' : 'border-[var(--kr-line)]'"
            @click="exportRange = opt.value"
          >
            <span class="text-[13px]">{{ opt.label }}</span>
            <span class="text-[11.5px] text-[var(--kr-ink-faint)]">{{ opt.notes.length }}件</span>
          </button>
        </div>
        <div class="mt-4 flex items-center justify-end gap-1.5">
          <button class="kr-btn-quiet" @click="exportOpen = false">閉じる</button>
          <button class="kr-btn-quiet" :disabled="!exportNotes.length" @click="downloadExport">保存</button>
          <button class="kr-btn-quiet !border-[var(--kr-accent)] !text-[var(--kr-accent-deep)]" :disabled="!exportNotes.length" @click="copyExport">
            {{ copied ? 'コピーしました' : 'コピー' }}
          </button>
        </div>
        <p v-if="copyError" class="mt-3 text-[11.5px] text-[var(--kr-ink-soft)]">コピーできませんでした。「保存」からテキストで書き出せます。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  buildExportText,
  dateKey,
  formatDateLabel,
  formatTime,
  groupByDate,
  useKirokuNotes,
  type KirokuNote,
} from '~/composables/kiroku/useKirokuNotes'
import { useKirokuTheme } from '~/composables/kiroku/useKirokuTheme'

definePageMeta({ layout: 'kiroku' })

useHead({
  title: 'kiroku — 記録',
  link: [
    { key: 'icon', rel: 'icon', type: 'image/svg+xml', href: '/icon-kiroku.svg' },
    { rel: 'manifest', href: '/manifest-kiroku.json' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon-kiroku.png' },
  ],
  meta: [
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-title', content: 'kiroku' },
    { name: 'theme-color', content: '#f5f2ec', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#16181b', media: '(prefers-color-scheme: dark)' },
    { name: 'robots', content: 'noindex' },
  ],
})

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const { sorted, total, recordedDays, loaded, storageError, update, remove } = useKirokuNotes()
const { isDark, toggle } = useKirokuTheme()

/* 探す */
const searchOpen = ref(false)
const query = ref('')
const searchEl = ref<HTMLInputElement | null>(null)
const toggleSearch = async () => {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) {
    await nextTick()
    searchEl.value?.focus()
  } else {
    query.value = ''
  }
}

/* カレンダー */
const calendarOpen = ref(false)
const today = new Date()
const calYear = ref(today.getFullYear())
const calMonth = ref(today.getMonth())
const selectedDay = ref('')

const isCurrentMonth = computed(
  () => calYear.value === today.getFullYear() && calMonth.value === today.getMonth(),
)

const shiftMonth = (diff: number) => {
  const d = new Date(calYear.value, calMonth.value + diff, 1)
  calYear.value = d.getFullYear()
  calMonth.value = d.getMonth()
}

type Cell = { day: number; key: string; marked: boolean; isToday: boolean } | null

const calendarCells = computed<Cell[]>(() => {
  const first = new Date(calYear.value, calMonth.value, 1)
  const days = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  const todayKey = dateKey(today.getTime())
  const cells: Cell[] = Array.from({ length: first.getDay() }, () => null)
  for (let day = 1; day <= days; day++) {
    const key = `${calYear.value}-${String(calMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, key, marked: recordedDays.value.has(key), isToday: key === todayKey })
  }
  return cells
})

const pickDay = (key: string) => {
  selectedDay.value = selectedDay.value === key ? '' : key
}
const selectedDayLabel = computed(() => (selectedDay.value ? formatDateLabel(selectedDay.value) : ''))

/* 一覧 */
const visible = computed(() => {
  let list = sorted.value
  if (selectedDay.value) list = list.filter((n) => dateKey(n.createdAt) === selectedDay.value)
  const q = query.value.trim().toLowerCase()
  if (q) list = list.filter((n) => n.text.toLowerCase().includes(q))
  return list
})
const groups = computed(() => groupByDate(visible.value))

const expandedId = ref('')
const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? '' : id
}

/* 編集（目立たせない。開いた記録からだけ入れる） */
const editingId = ref('')
const editText = ref('')
const editEl = ref<HTMLTextAreaElement[] | HTMLTextAreaElement | null>(null)

const autoGrow = (e: Event) => {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

const startEdit = async (note: KirokuNote) => {
  editingId.value = note.id
  editText.value = note.text
  await nextTick()
  const el = Array.isArray(editEl.value) ? editEl.value[0] : editEl.value
  if (el) {
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
    el.focus()
  }
}
const cancelEdit = () => {
  editingId.value = ''
  editText.value = ''
}
const commitEdit = (id: string) => {
  if (!editText.value.trim()) return
  update(id, editText.value)
  cancelEdit()
}

/* 削除（確認をはさむ） */
const deleteTarget = ref<KirokuNote | null>(null)
const askDelete = (note: KirokuNote) => {
  deleteTarget.value = note
}
const confirmDelete = () => {
  if (!deleteTarget.value) return
  remove(deleteTarget.value.id)
  if (expandedId.value === deleteTarget.value.id) expandedId.value = ''
  deleteTarget.value = null
}

/* まとめてコピー（セッションで一緒に読み返すため） */
type ExportRange = 'all' | 'recent30' | 'thisMonth' | 'filtered'
const exportOpen = ref(false)
const exportRange = ref<ExportRange>('all')
const copied = ref(false)
const copyError = ref(false)

const isFiltered = computed(() => !!selectedDay.value || !!query.value.trim())

const exportOptions = computed(() => {
  const now = new Date()
  const since30 = now.getTime() - 30 * 24 * 60 * 60 * 1000
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
  const options: { value: ExportRange; label: string; notes: KirokuNote[] }[] = [
    { value: 'all', label: 'すべて', notes: sorted.value },
    { value: 'recent30', label: '直近30日', notes: sorted.value.filter((n) => n.createdAt >= since30) },
    {
      value: 'thisMonth',
      label: `${now.getFullYear()}年${now.getMonth() + 1}月`,
      notes: sorted.value.filter((n) => n.createdAt >= monthStart),
    },
  ]
  if (isFiltered.value) options.push({ value: 'filtered', label: 'いま表示しているもの', notes: visible.value })
  return options
})

const currentOption = computed(
  () => exportOptions.value.find((o) => o.value === exportRange.value) ?? exportOptions.value[0],
)
const exportNotes = computed(() => currentOption.value.notes)
const exportText = computed(() => buildExportText(exportNotes.value, currentOption.value.label))

const openExport = () => {
  exportRange.value = isFiltered.value ? 'filtered' : 'all'
  copied.value = false
  copyError.value = false
  exportOpen.value = true
}

const copyExport = async () => {
  try {
    await navigator.clipboard.writeText(exportText.value)
    copied.value = true
    copyError.value = false
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    copyError.value = true
  }
}

const downloadExport = () => {
  const blob = new Blob([exportText.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kiroku-${dateKey(Date.now())}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 絞り込みが外れたら、消えた選択肢を選んだままにしない
watch(isFiltered, (v) => {
  if (!v && exportRange.value === 'filtered') exportRange.value = 'all'
})
</script>
