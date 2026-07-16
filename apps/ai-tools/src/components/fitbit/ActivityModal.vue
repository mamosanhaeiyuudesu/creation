<template>
  <div class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" @click.self="$emit('close')">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />
    <div class="relative w-full sm:max-w-[640px] max-h-[92dvh] overflow-y-auto bg-[#0f172a] border border-white/[0.08] rounded-t-3xl sm:rounded-3xl shadow-2xl [scrollbar-width:thin]">
      <!-- ハンドル / 週送り / 閉じる -->
      <div class="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-[#0f172a]/95 backdrop-blur border-b border-white/[0.06]">
        <h2 class="text-sm font-bold text-slate-100">アクティビティ</h2>
        <div class="flex items-center gap-1">
          <button class="w-7 h-7 rounded-lg text-slate-300 hover:bg-white/10 flex items-center justify-center" @click="shiftWeek(-1)">‹</button>
          <span class="text-xs font-semibold text-slate-200 min-w-[112px] text-center tabular-nums">{{ rangeLabel }}</span>
          <button
            class="w-7 h-7 rounded-lg flex items-center justify-center"
            :class="isThisWeek ? 'text-slate-700 cursor-default' : 'text-slate-300 hover:bg-white/10'"
            :disabled="isThisWeek"
            @click="shiftWeek(1)"
          >›</button>
          <button class="w-8 h-8 ml-1 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="$emit('close')">✕</button>
        </div>
      </div>

      <div v-if="loading" class="p-10 text-center text-slate-500 text-sm">読み込み中…</div>
      <div v-else-if="error" class="p-10 text-center text-rose-400 text-sm">{{ error }}</div>

      <div v-else class="p-5">
        <div class="overflow-x-auto [scrollbar-width:thin]">
          <div class="grid grid-cols-7 gap-1.5 min-w-[560px]">
            <div v-for="col in columns" :key="col.date" class="flex flex-col gap-1.5">
              <!-- 曜日ヘッダー -->
              <div
                class="text-center rounded-lg py-1.5"
                :class="col.isToday ? 'bg-emerald-500/15 text-emerald-300' : 'text-slate-400'"
              >
                <div class="text-[10px] font-semibold">{{ col.weekday }}</div>
                <div class="text-[10px] tabular-nums opacity-70">{{ col.md }}</div>
              </div>

              <!-- エクササイズ一覧（縦に並ぶ） -->
              <div v-if="col.activities.length" class="flex flex-col gap-1.5">
                <div
                  v-for="(a, i) in col.activities"
                  :key="i"
                  class="relative rounded-xl border px-2 py-2 flex flex-col items-center gap-0.5 text-center"
                  :class="a.manual ? 'bg-sky-500/[0.08] border-sky-400/20' : 'bg-white/[0.04] border-white/[0.07]'"
                >
                  <button
                    v-if="a.manual && a.id"
                    class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-slate-700 hover:bg-rose-500 text-white text-[10px] leading-none flex items-center justify-center"
                    title="削除"
                    @click.stop="removeManual(a.id)"
                  >✕</button>
                  <span class="text-base leading-none">{{ a.icon }}</span>
                  <span class="text-[10px] font-semibold text-slate-200 leading-tight">{{ a.label }}</span>
                  <span class="text-[9px] text-slate-500 tabular-nums leading-tight">{{ a.start }}-{{ a.end }}</span>
                  <span class="text-[9px] text-amber-400/90 tabular-nums leading-tight">{{ a.durationMin }}分・{{ a.caloriesKcal }}kcal</span>
                  <span v-if="a.manual" class="text-[8px] text-sky-300/80 leading-tight">手動</span>
                </div>
              </div>

              <!-- 各曜日の記録追加ボタン（運動リストの下に＋） -->
              <button
                class="rounded-xl border border-dashed border-white/[0.1] flex items-center justify-center text-slate-500 hover:text-sky-300 hover:border-sky-400/40 hover:bg-sky-500/[0.06] transition-colors"
                :class="col.activities.length ? 'py-1.5' : 'flex-1 min-h-[56px]'"
                title="記録を追加"
                @click="openAdd(col.date)"
              >
                <span class="text-sm leading-none">＋</span>
              </button>
            </div>
          </div>
        </div>

        <div v-if="!totalCount" class="mt-5 text-center text-slate-500 text-sm">記録された運動はありません。各曜日の ＋ から追加できます。</div>
      </div>
    </div>

    <!-- 記録追加ミニフォーム（各曜日の＋から開く。日付はその曜日で固定） -->
    <div v-if="addDate" class="fixed inset-0 z-[110] flex items-center justify-center p-4" @click.self="closeAdd">
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeAdd" />
      <div class="relative w-full max-w-[360px] bg-[#0f172a] border border-white/[0.1] rounded-2xl shadow-2xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-bold text-slate-100">記録を追加 <span class="text-sky-300/90 font-normal">{{ addDateLabel }}</span></h3>
          <button class="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-white/10" @click="closeAdd">✕</button>
        </div>

        <form class="flex flex-col gap-3" @submit.prevent="submitManual">
          <div class="flex flex-col gap-1">
            <label class="text-[10px] text-slate-500">種目（自由入力）</label>
            <input
              v-model="form.label"
              type="text"
              maxlength="40"
              placeholder="例: 剣道、ヨガ、筋トレ…"
              class="rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-sky-400/40"
              @keydown.enter.prevent
            />
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-500">開始</label>
              <input v-model="form.start" type="time" class="rounded-xl bg-white/[0.05] border border-white/[0.08] px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-400/40 [color-scheme:dark]" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-[10px] text-slate-500">終了</label>
              <input v-model="form.end" type="time" class="rounded-xl bg-white/[0.05] border border-white/[0.08] px-2.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-sky-400/40 [color-scheme:dark]" />
            </div>
          </div>

          <div v-if="addError" class="text-xs text-rose-400">{{ addError }}</div>

          <button
            type="submit"
            :disabled="adding || !form.label.trim() || !form.start || !form.end"
            class="h-9 px-5 rounded-xl bg-sky-500/90 text-white text-sm font-semibold disabled:opacity-40 hover:bg-sky-500 transition-colors"
          >{{ adding ? 'AIが計算中…' : '追加' }}</button>
        </form>
        <p class="mt-2.5 text-[10px] text-slate-600 leading-relaxed">運動時間と消費カロリーはAIが自動で見積もります。</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import type { ActivitySession } from '~/types/fitbit'
import { todayJST } from '~/utils/jst'

const props = defineProps<{ date: string }>()
defineEmits<{ close: [] }>()

interface DayActivities { date: string; activities: ActivitySession[] }

const WEEKDAYS_JA = ['日', '月', '火', '水', '木', '金', '土']

const anchorDate = ref(props.date || todayJST())
const isThisWeek = computed(() => anchorDate.value >= todayJST())

const days = ref<DayActivities[]>([])
const loading = ref(true)
const error = ref('')

const rangeLabel = computed(() => {
  if (!days.value.length) return ''
  const first = days.value[0].date
  const last = days.value[days.value.length - 1].date
  const md = (ymd: string) => {
    const d = new Date(`${ymd}T00:00:00Z`)
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
  }
  return `${md(first)} - ${md(last)}`
})

const columns = computed(() =>
  days.value.map((d) => {
    const dt = new Date(`${d.date}T00:00:00Z`)
    return {
      date: d.date,
      weekday: WEEKDAYS_JA[dt.getUTCDay()],
      md: `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}`,
      isToday: d.date === todayJST(),
      activities: d.activities,
    }
  }),
)

const totalCount = computed(() => days.value.reduce((sum, d) => sum + d.activities.length, 0))

function shiftWeek(delta: number) {
  const d = new Date(`${anchorDate.value}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta * 7)
  const next = d.toISOString().slice(0, 10)
  if (next > todayJST()) return
  anchorDate.value = next > todayJST() ? todayJST() : next
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await $fetch<{ days: DayActivities[] }>('/api/fitbit/activity', { params: { date: anchorDate.value, days: 7 } })
    days.value = res.days
  } catch (e: any) {
    error.value = e?.data?.message || 'アクティビティの取得に失敗しました'
  } finally {
    loading.value = false
  }
}

// ── 記録を追加（各曜日の＋から。日付はその曜日で固定・AIカロリー推定） ──
const form = reactive({ label: '', start: '', end: '' })
const addDate = ref<string | null>(null)
const adding = ref(false)
const addError = ref('')

const addDateLabel = computed(() => {
  if (!addDate.value) return ''
  const d = new Date(`${addDate.value}T00:00:00Z`)
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS_JA[d.getUTCDay()]}）`
})

function openAdd(date: string) {
  addDate.value = date
  addError.value = ''
  form.label = ''
  form.start = ''
  form.end = ''
}

function closeAdd() {
  addDate.value = null
}

async function submitManual() {
  if (!addDate.value || adding.value || !form.label.trim() || !form.start || !form.end) return
  adding.value = true
  addError.value = ''
  try {
    await $fetch<{ activity: ActivitySession }>('/api/fitbit/manual-activity', {
      method: 'POST',
      body: { date: addDate.value, label: form.label.trim(), start: form.start, end: form.end },
    })
    closeAdd()
    load() // 追加した日は表示中の週内なので再取得で反映
  } catch (e: any) {
    addError.value = e?.data?.message || '記録の追加に失敗しました'
  } finally {
    adding.value = false
  }
}

async function removeManual(id: string) {
  try {
    await $fetch('/api/fitbit/manual-activity', { method: 'DELETE', query: { id } })
    load()
  } catch (e: any) {
    addError.value = e?.data?.message || '削除に失敗しました'
  }
}

onMounted(load)
watch(anchorDate, load)
</script>
