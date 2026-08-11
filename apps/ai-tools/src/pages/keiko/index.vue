<template>
  <div class="max-w-[880px] mx-auto px-4 sm:px-6 pt-6 pb-24">
    <div class="flex items-center justify-between gap-2 mb-4">
      <div class="flex items-center gap-2.5">
        <span class="text-3xl" style="font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif">🥋</span>
        <div>
          <h1 class="keiko-display text-[22px] sm:text-[26px] font-bold leading-none">けいこ記録</h1>
          <p class="text-[12px] text-[var(--keiko-ink-soft)] mt-1">素振り・練習の記録に花丸をつけよう</p>
        </div>
      </div>
      <div class="flex items-center gap-1.5">
        <button class="keiko-btn-ghost !h-9 !px-2.5" title="設定" @click="settingsOpen = true">⚙</button>
        <button v-if="isLoggedIn" class="text-[13px] text-[var(--keiko-ink-soft)] px-2.5 py-1.5 rounded-full hover:bg-black/[0.04]" @click="doLogout">ログアウト</button>
      </div>
    </div>

    <!-- 週ナビ -->
    <div class="flex items-center justify-between gap-2 mb-5">
      <button class="keiko-btn-ghost !h-9 !px-3" @click="shiftWeek(-1)">‹ 前の週</button>
      <div class="flex flex-col items-center">
        <span class="text-[14px] font-bold">{{ weekRangeLabel }}</span>
        <button v-if="!isCurrentWeek" class="text-[11px] text-[var(--keiko-gold)] font-semibold mt-0.5" @click="goToday">今週に戻る</button>
      </div>
      <button class="keiko-btn-ghost !h-9 !px-3" @click="shiftWeek(1)">次の週 ›</button>
    </div>

    <!-- ローディング -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-28 rounded-2xl bg-white/70 animate-pulse" />
    </div>

    <template v-else>
      <p v-if="members.length === 0" class="text-center text-[var(--keiko-ink-soft)] py-16 text-[14px]">
        設定（⚙）からメンバーを追加してください
      </p>

      <div v-for="member in members" :key="member.id" class="mb-5 rounded-2xl border border-[var(--keiko-line)] bg-[var(--keiko-card)] overflow-hidden">
        <h2 class="keiko-display px-4 pt-3 pb-2 text-[16px] font-bold flex items-center gap-1.5">
          <span class="inline-block w-1.5 h-4 rounded-full" style="background: var(--keiko-navy)" />
          {{ member.name }}
        </h2>

        <div v-if="activeItems.length === 0" class="px-4 pb-4 text-[13px] text-[var(--keiko-ink-soft)]">
          設定（⚙）から練習項目を追加してください
        </div>

        <div v-else class="overflow-x-auto px-1 pb-1">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="keiko-th text-left pl-3 min-w-[92px]">項目</th>
                <th
                  v-for="day in weekDays"
                  :key="day.date"
                  class="keiko-th text-center w-[13%]"
                  :class="{ 'keiko-th--today': day.date === todayStr, 'keiko-th--sun': day.weekdayIndex === 0, 'keiko-th--sat': day.weekdayIndex === 6 }"
                >
                  <div class="leading-tight">{{ day.month }}/{{ day.day }}</div>
                  <div class="text-[10px] font-normal leading-tight">({{ day.weekdayLabel }})</div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in activeItems" :key="item.id" class="border-t border-[var(--keiko-line)]">
                <td class="pl-3 py-2 text-[13px] font-medium whitespace-nowrap">{{ item.name }}</td>
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
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 設定モーダル -->
    <div v-if="settingsOpen" class="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 z-[200]" @click.self="settingsOpen = false">
      <div class="w-full max-w-[440px] max-h-[85vh] overflow-y-auto bg-[var(--keiko-card)] rounded-2xl p-5">
        <h2 class="keiko-display font-bold text-[17px] mb-4">設定</h2>

        <!-- メンバー管理 -->
        <section class="mb-5">
          <h3 class="text-[12px] font-bold text-[var(--keiko-ink-soft)] mb-2">メンバー</h3>
          <div class="flex flex-col gap-1.5">
            <div v-for="m in members" :key="m.id" class="flex items-center gap-1.5">
              <input v-model="m.name" class="keiko-input !py-1.5 text-[13px]" @blur="saveMemberName(m)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
              <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5" title="削除" @click="deleteMember(m)">✕</button>
            </div>
          </div>
          <div class="flex items-center gap-1.5 mt-2">
            <input v-model="newMemberName" placeholder="＋ メンバーを追加" class="keiko-input !py-1.5 text-[13px]" @keydown.enter="addMember" />
            <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px]" @click="addMember">追加</button>
          </div>
        </section>

        <!-- 項目管理 -->
        <section>
          <h3 class="text-[12px] font-bold text-[var(--keiko-ink-soft)] mb-2">練習項目</h3>
          <div class="flex flex-col gap-1.5">
            <div v-for="it in items" :key="it.id" class="flex items-center gap-1.5">
              <label class="flex items-center" title="表示/非表示">
                <input type="checkbox" :checked="it.active" @change="toggleItemActive(it)" />
              </label>
              <input v-model="it.name" class="keiko-input !py-1.5 text-[13px]" :class="{ 'opacity-40': !it.active }" @blur="saveItemName(it)" @keydown.enter="($event.target as HTMLInputElement).blur()" />
              <button class="text-[13px] text-[var(--keiko-ink-soft)] hover:text-red-500 px-1.5" title="削除" @click="deleteItem(it)">✕</button>
            </div>
          </div>
          <div class="flex items-center gap-1.5 mt-2">
            <input v-model="newItemName" placeholder="＋ 練習項目を追加（例: 素振り）" class="keiko-input !py-1.5 text-[13px]" @keydown.enter="addItem" />
            <button class="keiko-btn-ghost !h-8 !px-3 !text-[12px]" @click="addItem">追加</button>
          </div>
        </section>

        <button class="keiko-btn w-full mt-5" @click="settingsOpen = false">閉じる</button>
      </div>
    </div>

    <AuthModal v-if="showAuthModal" accent="sky" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useAuth } from '~/composables/useAuth'
import AuthModal from '~/components/AuthModal.vue'
import type { KeikoItem, KeikoMember, KeikoRecord, KeikoState } from '~/types/keiko'

definePageMeta({ layout: 'keiko' })
useHead({ title: 'けいこ記録' })

const { isLoggedIn, checked, checkAuth, logout } = useAuth()
const showAuthModal = computed(() => checked.value && !isLoggedIn.value)

const members = ref<KeikoMember[]>([])
const items = ref<KeikoItem[]>([])
const records = ref<KeikoRecord[]>([])
const loading = ref(true)

const activeItems = computed(() => items.value.filter((it) => it.active))

// ── 日付（JST基準で「日曜始まりの週」を扱う）──
const WD = ['日', '月', '火', '水', '木', '金', '土']

function todayJst(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' })
}
function startOfWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() - d.getDay())
  return d.toLocaleDateString('sv-SE')
}
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('sv-SE')
}

const todayStr = todayJst()
const thisWeekStart = startOfWeek(todayStr)
const weekStart = ref(thisWeekStart)
const isCurrentWeek = computed(() => weekStart.value === thisWeekStart)

const weekDays = computed(() => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(weekStart.value, i)
    const d = new Date(date + 'T00:00:00')
    return { date, month: d.getMonth() + 1, day: d.getDate(), weekdayIndex: i, weekdayLabel: WD[i] }
  })
})

const weekRangeLabel = computed(() => {
  const days = weekDays.value
  const first = days[0]
  const last = days[6]
  return `${first.month}/${first.day}(${first.weekdayLabel}) 〜 ${last.month}/${last.day}(${last.weekdayLabel})`
})

function shiftWeek(delta: number) {
  weekStart.value = addDays(weekStart.value, delta * 7)
}
function goToday() {
  weekStart.value = thisWeekStart
}

// ── データ読み込み ──
async function loadState() {
  loading.value = true
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
  } finally {
    loading.value = false
  }
}

watch(weekStart, loadState)

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

// ── メンバー管理 ──
const settingsOpen = ref(false)
const newMemberName = ref('')

async function addMember() {
  const name = newMemberName.value.trim()
  if (!name) return
  try {
    const created = await $fetch<KeikoMember>('/api/keiko/members', { method: 'POST', body: { name } })
    members.value.push(created)
    newMemberName.value = ''
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
  if (!confirm(`「${m.name}」を削除しますか？記録も削除されます`)) return
  try {
    await $fetch(`/api/keiko/members/${m.id}`, { method: 'DELETE' })
    members.value = members.value.filter((x) => x.id !== m.id)
    records.value = records.value.filter((r) => r.memberId !== m.id)
  } catch {
    alert('削除に失敗しました')
  }
}

// ── 練習項目管理 ──
const newItemName = ref('')

async function addItem() {
  const name = newItemName.value.trim()
  if (!name) return
  try {
    const created = await $fetch<KeikoItem>('/api/keiko/items', { method: 'POST', body: { name } })
    items.value.push(created)
    newItemName.value = ''
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

async function doLogout() {
  await logout()
  window.location.reload()
}

onMounted(async () => {
  await checkAuth()
  await loadState()
})
</script>

<style scoped>
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
</style>
