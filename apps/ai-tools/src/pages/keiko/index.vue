<template>
  <div class="max-w-[980px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🥋</span>
        <div>
          <h1 class="keiko-display text-[22px] sm:text-[26px] font-bold leading-none">けいこ記録</h1>
          <p class="text-[12px] text-[var(--keiko-ink-soft)] mt-1">素振り・練習の記録に花丸をつけよう</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="keiko-btn-ghost !h-9 !px-2.5" title="設定" @click="openSettings">⚙</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--keiko-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </div>

    <!-- 週／月／年 の切り替え -->
    <div class="keiko-tabs mb-3">
      <button v-for="m in MODES" :key="m.key" class="keiko-tab" :class="{ 'keiko-tab--on': mode === m.key }" @click="mode = m.key">
        {{ m.label }}
      </button>
    </div>

    <!-- 期間ナビ -->
    <div class="flex items-center justify-between gap-2 mb-5">
      <button class="keiko-btn-ghost !h-9 !px-3" @click="shiftRange(-1)">‹ {{ prevLabel }}</button>
      <div class="flex flex-col items-center">
        <span class="text-[14px] font-bold">{{ rangeLabel }}</span>
        <button v-if="!isCurrentRange" class="text-[11px] text-[var(--keiko-gold)] font-semibold mt-0.5" @click="goCurrent">{{ backLabel }}</button>
      </div>
      <button class="keiko-btn-ghost !h-9 !px-3" @click="shiftRange(1)">{{ nextLabel }} ›</button>
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-white/70 animate-pulse" />
    </div>

    <template v-else>
      <p v-if="members.length === 0" class="text-center text-[var(--keiko-ink-soft)] py-16 text-[14px]">
        設定（⚙）からメンバーを追加してください
      </p>

      <!-- ── 週表示：メンバーごとに項目×曜日の花丸表 ── -->
      <template v-else-if="mode === 'week'">
        <div v-for="(member, mi) in members" :key="member.id" class="mb-5 rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-hidden">
          <div class="flex items-center justify-between gap-2 px-4 pt-3 pb-2">
            <h2 class="keiko-display text-[16px] font-bold flex items-center gap-1.5">
              <span class="inline-block w-1.5 h-4 rounded-full" :style="{ background: memberColor(mi) }" />
              {{ member.name }}
            </h2>
            <span class="keiko-total" :style="{ color: memberColor(mi) }">
              週合計 <strong class="text-[17px]">{{ memberRangePoints(member.id) }}</strong> pt
            </span>
          </div>

          <div v-if="itemsOf(member.id).length === 0" class="px-4 pb-4 text-[13px] text-[var(--keiko-ink-soft)]">
            設定（⚙）から {{ member.name }} の練習項目を追加してください
          </div>

          <div v-else class="overflow-x-auto px-1 pb-1">
            <table class="w-full border-collapse">
              <thead>
                <tr>
                  <th class="keiko-th text-left pl-3 min-w-[124px]">やること</th>
                  <th
                    v-for="day in weekDays"
                    :key="day.date"
                    class="keiko-th text-center w-[11%]"
                    :class="{ 'keiko-th--today': day.date === todayStr, 'keiko-th--sun': day.weekdayIndex === 6, 'keiko-th--sat': day.weekdayIndex === 5 }"
                  >
                    <div class="leading-tight">{{ day.month }}/{{ day.day }}</div>
                    <div class="text-[10px] font-normal leading-tight">({{ day.weekdayLabel }})</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in itemsOf(member.id)" :key="item.id" class="border-t border-[var(--keiko-line)]">
                  <td class="pl-3 py-2">
                    <div class="text-[13px] font-medium leading-tight">{{ item.name }}</div>
                    <div class="text-[10.5px] text-[var(--keiko-ink-soft)] leading-tight mt-0.5">
                      {{ item.repCount }}本 × {{ item.pointPerRep }}pt = <strong>{{ itemPoints(item) }}pt</strong>
                    </div>
                  </td>
                  <td v-for="day in weekDays" :key="day.date" class="text-center py-1.5" :class="{ 'keiko-td--today': day.date === todayStr }">
                    <button
                      class="keiko-cell"
                      :aria-label="`${member.name} ${item.name} ${day.month}/${day.day}`"
                      @click="toggleCell(member.id, item.id, day.date)"
                    >
                      <span v-if="isDone(member.id, item.id, day.date)" key="on" class="keiko-pop text-[22px] leading-none">💮</span>
                      <span v-else key="off" class="keiko-cell-empty" />
                    </button>
                  </td>
                </tr>
                <tr class="border-t border-[var(--keiko-line)] bg-black/[0.015]">
                  <td class="pl-3 py-1.5 text-[11.5px] font-bold text-[var(--keiko-ink-soft)]">ポイント</td>
                  <td
                    v-for="day in weekDays"
                    :key="day.date"
                    class="text-center py-1.5 text-[12px] font-bold"
                    :class="{ 'keiko-td--today': day.date === todayStr }"
                    :style="{ color: memberDayPoints(member.id, day.date) ? memberColor(mi) : 'var(--keiko-line)' }"
                  >
                    {{ memberDayPoints(member.id, day.date) || '·' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </template>

      <!-- ── 月表示：大きいカレンダーにメンバーごとのポイントだけを出す ── -->
      <template v-else-if="mode === 'month'">
        <div class="flex flex-wrap gap-2 mb-3">
          <span
            v-for="(member, mi) in members"
            :key="member.id"
            class="keiko-chip"
            :style="{ color: memberColor(mi), borderColor: memberColor(mi) + '55' }"
          >
            <span class="w-2 h-2 rounded-full" :style="{ background: memberColor(mi) }" />
            {{ member.name }} <strong>{{ memberRangePoints(member.id) }}</strong>pt
          </span>
        </div>

        <div class="rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-hidden">
          <div class="grid grid-cols-7">
            <div
              v-for="(label, i) in WD"
              :key="label"
              class="keiko-th text-center py-2 border-b border-[var(--keiko-line)]"
              :class="{ 'keiko-th--sun': i === 6, 'keiko-th--sat': i === 5 }"
            >
              {{ label }}
            </div>
          </div>
          <div class="grid grid-cols-7">
            <div
              v-for="cell in monthGrid"
              :key="cell.date"
              class="keiko-daycell"
              :class="{ 'keiko-daycell--out': !cell.inMonth, 'keiko-daycell--today': cell.date === todayStr }"
            >
              <div class="text-[11.5px] font-bold mb-1" :class="{ 'keiko-th--sun': cell.weekdayIndex === 6, 'keiko-th--sat': cell.weekdayIndex === 5 }">
                {{ cell.day }}
              </div>
              <div v-if="cell.inMonth" class="flex flex-col gap-[3px]">
                <div
                  v-for="member in membersWithPointsOn(cell.date)"
                  :key="member.id"
                  class="keiko-daypoint"
                  :style="{ color: memberColor(member.index), background: memberColor(member.index) + '14' }"
                >
                  <span class="truncate">{{ member.name }}</span>
                  <strong>{{ member.points }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p class="text-[11.5px] text-[var(--keiko-ink-soft)] mt-2 text-center">日ごとの獲得ポイント（花丸のついた項目の合計）</p>
      </template>

      <!-- ── 年表示：メンバーごとの月別ポイント一覧 ── -->
      <template v-else>
        <div class="rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-x-auto">
          <table class="w-full border-collapse min-w-[320px]">
            <thead>
              <tr class="border-b border-[var(--keiko-line)]">
                <th class="keiko-th text-left pl-4 py-2.5 w-[72px]">月</th>
                <th v-for="(member, mi) in members" :key="member.id" class="keiko-th text-center py-2.5" :style="{ color: memberColor(mi) }">
                  {{ member.name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in yearRows" :key="row.key" class="border-b border-[var(--keiko-line)]" :class="{ 'keiko-row--now': row.key === currentMonthKey }">
                <td class="pl-4 py-2.5 text-[13px] font-bold whitespace-nowrap">{{ row.month }}月</td>
                <td v-for="(member, mi) in members" :key="member.id" class="text-center py-2.5 relative">
                  <span
                    class="keiko-yearbar"
                    :style="{ width: barWidth(pointsFor(member.id, row.key)), background: memberColor(mi) + '1f' }"
                  />
                  <span class="relative text-[14px] font-bold" :style="{ color: pointsFor(member.id, row.key) ? memberColor(mi) : 'var(--keiko-line)' }">
                    {{ pointsFor(member.id, row.key) || '·' }}
                  </span>
                </td>
              </tr>
              <tr class="bg-black/[0.02]">
                <td class="pl-4 py-3 text-[12px] font-bold text-[var(--keiko-ink-soft)]">年合計</td>
                <td v-for="(member, mi) in members" :key="member.id" class="text-center py-3">
                  <span class="text-[15px] font-bold" :style="{ color: memberColor(mi) }">{{ memberRangePoints(member.id) }}</span>
                  <span class="text-[10.5px] text-[var(--keiko-ink-soft)] ml-0.5">pt</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>

    <!-- 設定モーダル -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[200]" @click.self="closeSettings">
      <div class="w-full max-w-[520px] max-h-[86vh] overflow-y-auto bg-[var(--keiko-card)] rounded-2xl p-5">
        <h2 class="keiko-display font-bold text-[17px] mb-1">設定</h2>
        <p class="text-[11.5px] text-[var(--keiko-ink-soft)] mb-4">やることと本数、1本あたりのポイントをメンバーごとに決められます</p>

        <section v-for="(m, mi) in members" :key="m.id" class="mb-4 rounded-xl border border-[var(--keiko-line)] p-3">
          <div class="flex items-center gap-1.5 mb-2.5">
            <span class="inline-block w-1.5 h-5 rounded-full shrink-0" :style="{ background: memberColor(mi) }" />
            <input v-model="m.name" class="keiko-input !py-1.5 text-[13px] font-bold" @blur="saveMemberName(m)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
            <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5 shrink-0" title="メンバーを削除" @click="deleteMember(m)">✕</button>
          </div>

          <div class="flex flex-col gap-2">
            <div v-for="it in allItemsOf(m.id)" :key="it.id" class="rounded-lg bg-black/[0.02] p-2">
              <div class="flex items-center gap-1.5">
                <label class="flex items-center shrink-0" title="表示/非表示">
                  <input type="checkbox" :checked="it.active" @change="toggleItemActive(it)" />
                </label>
                <input
                  v-model="it.name"
                  placeholder="やること"
                  class="keiko-input !py-1.5 text-[13px]"
                  :class="{ 'opacity-40': !it.active }"
                  @blur="saveItemName(it)"
                  @keydown.enter="($event.target as HTMLInputElement).blur()"
                />
                <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5 shrink-0" title="削除" @click="deleteItem(it)">✕</button>
              </div>
              <div class="flex items-center gap-1 mt-1.5 pl-[22px] text-[12px] text-[var(--keiko-ink-soft)]">
                <input v-model.number="it.repCount" type="number" min="1" class="keiko-num" @change="saveItemNumbers(it)" />
                <span>本</span>
                <span class="px-0.5">×</span>
                <input v-model.number="it.pointPerRep" type="number" min="1" class="keiko-num" @change="saveItemNumbers(it)" />
                <span>pt/本</span>
                <span class="ml-auto text-[12px] font-bold" :style="{ color: memberColor(mi) }">= {{ itemPoints(it) }}pt</span>
              </div>
            </div>
          </div>

          <div v-if="drafts[m.id]" class="mt-2 rounded-lg border border-dashed border-[var(--keiko-line)] p-2">
            <input v-model="drafts[m.id].name" placeholder="＋ やること（例: はや素振り）" class="keiko-input !py-1.5 text-[13px]" @keydown.enter="addItem(m.id)" />
            <div class="flex items-center gap-1 mt-1.5 text-[12px] text-[var(--keiko-ink-soft)]">
              <input v-model.number="drafts[m.id].repCount" type="number" min="1" class="keiko-num" />
              <span>本</span>
              <span class="px-0.5">×</span>
              <input v-model.number="drafts[m.id].pointPerRep" type="number" min="1" class="keiko-num" />
              <span>pt/本</span>
              <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px] ml-auto" @click="addItem(m.id)">追加</button>
            </div>
          </div>
        </section>

        <div class="flex items-center gap-1.5">
          <input v-model="newMemberName" placeholder="＋ メンバーを追加" class="keiko-input !py-1.5 text-[13px]" @keydown.enter="addMember" />
          <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px] shrink-0" @click="addMember">追加</button>
        </div>

        <button class="keiko-btn w-full mt-5" @click="closeSettings">閉じる</button>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import type { KeikoItem, KeikoMember, KeikoPoints, KeikoPointBucket, KeikoRecord, KeikoState } from '~/types/keiko'

definePageMeta({ layout: 'keiko' })
useHead({ title: 'けいこ記録' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

type Mode = 'week' | 'month' | 'year'
const MODES: { key: Mode; label: string }[] = [
  { key: 'week', label: '週' },
  { key: 'month', label: '月' },
  { key: 'year', label: '年' },
]
const mode = ref<Mode>('week')

const members = ref<KeikoMember[]>([])
const items = ref<KeikoItem[]>([])
const records = ref<KeikoRecord[]>([])
const buckets = ref<KeikoPointBucket[]>([])
const loading = ref(true)

// メンバーの色（表・カレンダー・年表で共通に使う）
const MEMBER_COLORS = ['#1c2540', '#c9a227', '#3b82c4', '#e0524b', '#4f9d69', '#8a63b8']
function memberColor(index: number): string {
  return MEMBER_COLORS[index % MEMBER_COLORS.length]
}

// ── 日付（JST基準。週は月曜始まり）──
const WD = ['月', '火', '水', '木', '金', '土', '日']

function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // 月曜まで戻す
  return d.toLocaleDateString('sv-SE')
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}
/** その月の日数。ym は YYYY-MM。 */
function daysInMonth(ym: string): number {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}
function shiftMonthKey(ym: string, delta: number): string {
  const [y, m] = ym.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const todayStr = todayJst()
const thisWeekStart = startOfWeek(todayStr)
const currentMonthKey = todayStr.slice(0, 7)
const currentYear = Number(todayStr.slice(0, 4))

const weekStart = ref(thisWeekStart)
const monthKey = ref(currentMonthKey)
const year = ref(currentYear)

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart.value, i)
    const d = new Date(date + 'T00:00:00')
    return { date, month: d.getMonth() + 1, day: d.getDate(), weekdayIndex: i, weekdayLabel: WD[i] }
  })
)

/** 表示中の期間 [from, to]。集計はこの範囲で行う。 */
const range = computed<{ from: string; to: string }>(() => {
  if (mode.value === 'week') return { from: weekStart.value, to: addDays(weekStart.value, 6) }
  if (mode.value === 'month') return { from: `${monthKey.value}-01`, to: `${monthKey.value}-${String(daysInMonth(monthKey.value)).padStart(2, '0')}` }
  return { from: `${year.value}-01-01`, to: `${year.value}-12-31` }
})

const rangeLabel = computed(() => {
  if (mode.value === 'week') {
    const [first, last] = [weekDays.value[0], weekDays.value[6]]
    return `${first.month}/${first.day}(${first.weekdayLabel}) 〜 ${last.month}/${last.day}(${last.weekdayLabel})`
  }
  if (mode.value === 'month') {
    const [y, m] = monthKey.value.split('-')
    return `${y}年${Number(m)}月`
  }
  return `${year.value}年`
})
const prevLabel = computed(() => (mode.value === 'week' ? '前の週' : mode.value === 'month' ? '前の月' : '前の年'))
const nextLabel = computed(() => (mode.value === 'week' ? '次の週' : mode.value === 'month' ? '次の月' : '次の年'))
const backLabel = computed(() => (mode.value === 'week' ? '今週に戻る' : mode.value === 'month' ? '今月に戻る' : '今年に戻る'))
const isCurrentRange = computed(() => {
  if (mode.value === 'week') return weekStart.value === thisWeekStart
  if (mode.value === 'month') return monthKey.value === currentMonthKey
  return year.value === currentYear
})

function shiftRange(delta: number) {
  if (mode.value === 'week') weekStart.value = addDays(weekStart.value, delta * 7)
  else if (mode.value === 'month') monthKey.value = shiftMonthKey(monthKey.value, delta)
  else year.value += delta
}
function goCurrent() {
  if (mode.value === 'week') weekStart.value = thisWeekStart
  else if (mode.value === 'month') monthKey.value = currentMonthKey
  else year.value = currentYear
}

/** 月カレンダーのマス（前後の月にはみ出す分も月曜始まりで埋める）。 */
const monthGrid = computed(() => {
  const from = `${monthKey.value}-01`
  const to = `${monthKey.value}-${String(daysInMonth(monthKey.value)).padStart(2, '0')}`
  const cells: { date: string; day: number; inMonth: boolean; weekdayIndex: number }[] = []
  const gridEnd = addDays(startOfWeek(to), 6)
  for (let d = startOfWeek(from); d <= gridEnd; d = addDays(d, 1)) {
    cells.push({ date: d, day: Number(d.slice(8, 10)), inMonth: d.slice(0, 7) === monthKey.value, weekdayIndex: cells.length % 7 })
  }
  return cells
})

const yearRows = computed(() =>
  Array.from({ length: 12 }, (_, i) => ({ month: i + 1, key: `${year.value}-${String(i + 1).padStart(2, '0')}` }))
)

// ── データ読み込み ──
// メンバーと練習項目は設定画面でも使うので、モードに関わらず state から取る。
async function loadState() {
  try {
    const data = await $fetch<KeikoState>('/api/keiko/state', {
      query: { from: weekStart.value, to: addDays(weekStart.value, 6) },
    })
    members.value = data.members
    items.value = data.items
    records.value = data.records
  } catch {
    members.value = []
    items.value = []
    records.value = []
  }
}

async function loadPoints() {
  const unit = mode.value === 'year' ? 'month' : 'day'
  try {
    const data = await $fetch<KeikoPoints>('/api/keiko/points', { query: { ...range.value, unit } })
    members.value = data.members
    buckets.value = data.buckets
  } catch {
    buckets.value = []
  }
}

async function load() {
  loading.value = true
  try {
    if (mode.value === 'week') await loadState()
    else await Promise.all([loadState(), loadPoints()])
  } finally {
    loading.value = false
  }
}

watch([mode, weekStart, monthKey, year], load)

// ── ポイント計算 ──
const itemMap = computed(() => new Map(items.value.map((it) => [it.id, it])))
function itemPoints(it: { repCount: number; pointPerRep: number }): number {
  return (Number(it.repCount) || 0) * (Number(it.pointPerRep) || 0)
}
/** そのメンバーの表示中の項目（非表示は除く）。 */
function itemsOf(memberId: string): KeikoItem[] {
  return items.value.filter((it) => it.memberId === memberId && it.active)
}
/** そのメンバーの全項目（設定画面用。非表示も含む）。 */
function allItemsOf(memberId: string): KeikoItem[] {
  return items.value.filter((it) => it.memberId === memberId)
}

/** 週表示のその日のポイント（読み込み済みの花丸から計算）。 */
function memberDayPoints(memberId: string, date: string): number {
  let sum = 0
  for (const r of records.value) {
    if (r.memberId !== memberId || r.date !== date) continue
    const it = itemMap.value.get(r.itemId)
    if (it) sum += itemPoints(it)
  }
  return sum
}

const bucketMap = computed(() => {
  const map = new Map<string, number>()
  for (const b of buckets.value) map.set(`${b.memberId}|${b.key}`, b.points)
  return map
})
function pointsFor(memberId: string, key: string): number {
  return bucketMap.value.get(`${memberId}|${key}`) ?? 0
}

/** 表示中の期間のメンバー合計ポイント。 */
function memberRangePoints(memberId: string): number {
  if (mode.value === 'week') return weekDays.value.reduce((sum, d) => sum + memberDayPoints(memberId, d.date), 0)
  return buckets.value.reduce((sum, b) => (b.memberId === memberId ? sum + b.points : sum), 0)
}

/** 月カレンダーのその日に出すメンバー（ポイントが入った人だけ）。 */
function membersWithPointsOn(date: string) {
  return members.value
    .map((m, index) => ({ id: m.id, name: m.name, index, points: pointsFor(m.id, date) }))
    .filter((m) => m.points > 0)
}

const yearMax = computed(() => Math.max(1, ...buckets.value.map((b) => b.points)))
function barWidth(points: number): string {
  return `${Math.round((points / yearMax.value) * 100)}%`
}

// ── 花丸トグル ──
const doneSet = computed(() => new Set(records.value.map((r) => `${r.memberId}|${r.itemId}|${r.date}`)))
function isDone(memberId: string, itemId: string, date: string): boolean {
  return doneSet.value.has(`${memberId}|${itemId}|${date}`)
}

async function toggleCell(memberId: string, itemId: string, date: string) {
  const idx = records.value.findIndex((r) => r.memberId === memberId && r.itemId === itemId && r.date === date)
  const wasDone = idx !== -1
  if (wasDone) records.value.splice(idx, 1)
  else records.value.push({ memberId, itemId, date })

  try {
    await $fetch<{ done: boolean }>('/api/keiko/records/toggle', { method: 'POST', body: { memberId, itemId, date } })
  } catch {
    // 失敗時はロールバック
    if (wasDone) records.value.push({ memberId, itemId, date })
    else {
      const revertIdx = records.value.findIndex((r) => r.memberId === memberId && r.itemId === itemId && r.date === date)
      if (revertIdx !== -1) records.value.splice(revertIdx, 1)
    }
    alert('保存に失敗しました')
  }
}

// ── 設定 ──
const settingsOpen = ref(false)
const newMemberName = ref('')
const drafts = reactive<Record<string, { name: string; repCount: number; pointPerRep: number }>>({})

function syncDrafts() {
  for (const m of members.value) if (!drafts[m.id]) drafts[m.id] = { name: '', repCount: 10, pointPerRep: 1 }
}
watch(() => members.value.map((m) => m.id).join('|'), syncDrafts, { immediate: true })

function openSettings() {
  syncDrafts()
  settingsOpen.value = true
}
function closeSettings() {
  settingsOpen.value = false
  // 本数・ポイントを変えると集計が変わるので、月/年表示は取り直す
  if (mode.value !== 'week') loadPoints()
}

async function addMember() {
  const name = newMemberName.value.trim()
  if (!name) return
  try {
    const created = await $fetch<{ member: KeikoMember; items: KeikoItem[] }>('/api/keiko/members', { method: 'POST', body: { name } })
    members.value.push(created.member)
    items.value.push(...created.items)
    newMemberName.value = ''
    syncDrafts()
  } catch {
    alert('追加に失敗しました')
  }
}
async function saveMemberName(m: KeikoMember) {
  const name = m.name.trim()
  if (!name) return
  try {
    await $fetch(`/api/keiko/members/${m.id}`, { method: 'PATCH', body: { name } })
  } catch {
    alert('保存に失敗しました')
  }
}
async function deleteMember(m: KeikoMember) {
  if (!confirm(`「${m.name}」を削除しますか？練習項目と記録も削除されます`)) return
  try {
    await $fetch(`/api/keiko/members/${m.id}`, { method: 'DELETE' })
    members.value = members.value.filter((x) => x.id !== m.id)
    items.value = items.value.filter((it) => it.memberId !== m.id)
    records.value = records.value.filter((r) => r.memberId !== m.id)
    buckets.value = buckets.value.filter((b) => b.memberId !== m.id)
  } catch {
    alert('削除に失敗しました')
  }
}

async function addItem(memberId: string) {
  const draft = drafts[memberId]
  const name = draft?.name.trim()
  if (!name) return
  const repCount = normalize(draft.repCount, 1)
  const pointPerRep = normalize(draft.pointPerRep, 1)
  try {
    const created = await $fetch<KeikoItem>('/api/keiko/items', { method: 'POST', body: { memberId, name, repCount, pointPerRep } })
    items.value.push(created)
    drafts[memberId] = { name: '', repCount, pointPerRep }
  } catch {
    alert('追加に失敗しました')
  }
}
async function saveItemName(it: KeikoItem) {
  const name = it.name.trim()
  if (!name) return
  try {
    await $fetch(`/api/keiko/items/${it.id}`, { method: 'PATCH', body: { name } })
  } catch {
    alert('保存に失敗しました')
  }
}
async function saveItemNumbers(it: KeikoItem) {
  it.repCount = normalize(it.repCount, 1)
  it.pointPerRep = normalize(it.pointPerRep, 1)
  try {
    await $fetch(`/api/keiko/items/${it.id}`, { method: 'PATCH', body: { repCount: it.repCount, pointPerRep: it.pointPerRep } })
  } catch {
    alert('保存に失敗しました')
  }
}
async function toggleItemActive(it: KeikoItem) {
  it.active = !it.active
  try {
    await $fetch(`/api/keiko/items/${it.id}`, { method: 'PATCH', body: { active: it.active } })
  } catch {
    it.active = !it.active
    alert('更新に失敗しました')
  }
}
async function deleteItem(it: KeikoItem) {
  if (!confirm(`「${it.name}」を削除しますか？記録も削除されます`)) return
  try {
    await $fetch(`/api/keiko/items/${it.id}`, { method: 'DELETE' })
    items.value = items.value.filter((x) => x.id !== it.id)
    records.value = records.value.filter((r) => r.itemId !== it.id)
  } catch {
    alert('削除に失敗しました')
  }
}

/** 1以上の整数へ丸める（空欄・0・マイナス対策）。 */
function normalize(v: unknown, fallback: number): number {
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 9999) : fallback
}

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  await load()
})
</script>

<style scoped>
.keiko-tabs {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(28, 37, 64, 0.06);
}
.keiko-tab {
  min-width: 58px;
  height: 30px;
  padding: 0 0.9rem;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  transition: background 0.15s, color 0.15s;
}
.keiko-tab--on {
  background: var(--keiko-card);
  color: var(--keiko-navy);
  box-shadow: 0 1px 3px rgba(28, 37, 64, 0.12);
}

.keiko-th {
  font-size: 11px;
  font-weight: 700;
  color: var(--keiko-ink-soft);
  padding: 0.4rem 0.25rem;
}
.keiko-th--today {
  color: var(--keiko-navy);
}
.keiko-th--sun {
  color: #e0524b;
}
.keiko-th--sat {
  color: #3b82c4;
}
.keiko-td--today {
  background: rgba(201, 162, 39, 0.08);
}
.keiko-total {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}
.keiko-cell {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.12s;
}
.keiko-cell:hover {
  background: rgba(28, 37, 64, 0.05);
}
.keiko-cell-empty {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1.5px dashed var(--keiko-line);
}

/* 月表示のカレンダー */
.keiko-daycell {
  min-height: 84px;
  padding: 6px 5px;
  border-top: 1px solid var(--keiko-line);
  border-right: 1px solid var(--keiko-line);
}
.keiko-daycell:nth-child(7n) {
  border-right: none;
}
.keiko-daycell--out {
  background: rgba(28, 37, 64, 0.025);
  color: var(--keiko-line);
}
.keiko-daycell--today {
  background: rgba(201, 162, 39, 0.1);
}
.keiko-daypoint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 3px;
  padding: 1px 5px;
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 700;
  line-height: 1.5;
}

/* 年表示 */
.keiko-yearbar {
  position: absolute;
  left: 6%;
  top: 20%;
  height: 60%;
  border-radius: 6px;
  transition: width 0.2s;
}
.keiko-row--now {
  background: rgba(201, 162, 39, 0.07);
}
.keiko-num {
  width: 52px;
  padding: 0.25rem 0.4rem;
  border: 1px solid var(--keiko-line);
  border-radius: 8px;
  background: var(--keiko-card);
  font-size: 12.5px;
  font-weight: 700;
  color: var(--keiko-ink);
  text-align: center;
}
.keiko-num:focus {
  outline: none;
  border-color: var(--keiko-gold);
}
</style>
