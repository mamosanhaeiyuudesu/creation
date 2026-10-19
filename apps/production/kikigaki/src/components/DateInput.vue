<template>
  <!-- 日付の欄。ブラウザ標準の日付欄は、カレンダーのボタンを押さないと開かず、月送りの矢印も上下なので、
       欄のどこを押しても開き、左右の矢印で月を送る小さなカレンダーを自前で持つ -->
  <div ref="root" class="kk-date">
    <button
      :id="id"
      type="button"
      class="kk-input kk-date-box"
      :class="{ 'is-empty': !modelValue }"
      :aria-expanded="open"
      aria-haspopup="dialog"
      @click="toggle"
    >
      <span class="truncate">{{ modelValue ? formatDateLabel(modelValue) : placeholder }}</span>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16M9 3v4M15 3v4" /></svg>
    </button>

    <div v-if="open" class="kk-date-pop" role="dialog" aria-label="日付を選ぶ" @keydown.esc.stop="close">
      <div class="kk-date-head">
        <button type="button" class="kk-date-nav" aria-label="前の月" @click="moveMonth(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        <span class="kk-date-month">{{ viewYear }}年{{ viewMonth + 1 }}月</span>
        <button type="button" class="kk-date-nav" aria-label="次の月" @click="moveMonth(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div class="kk-date-grid">
        <span v-for="(w, i) in WEEKDAYS" :key="w" class="kk-date-wd" :class="{ 'is-sun': i === 0, 'is-sat': i === 6 }">{{ w }}</span>
        <template v-for="(cell, i) in cells" :key="i">
          <span v-if="!cell" />
          <button
            v-else
            type="button"
            class="kk-date-day"
            :class="{
              'is-selected': cell.ymd === modelValue,
              'is-today': cell.ymd === today,
              'is-sun': cell.weekday === 0,
              'is-sat': cell.weekday === 6,
            }"
            @click="pick(cell.ymd)"
          >
            {{ cell.day }}
          </button>
        </template>
      </div>

      <div class="kk-date-foot">
        <button type="button" class="kk-date-link" @click="pick('')">消す</button>
        <button type="button" class="kk-date-link" @click="pick(today)">今日</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDateLabel } from '~/utils/formatDate'

const props = withDefaults(defineProps<{ modelValue: string; id?: string; placeholder?: string }>(), {
  id: undefined,
  placeholder: '日付を選ぶ',
})
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

const root = ref<HTMLElement | null>(null)
const open = ref(false)
const viewYear = ref(0)
const viewMonth = ref(0)

const pad = (n: number) => String(n).padStart(2, '0')
const toYmd = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`

/** 端末の「今日」（日付欄は利用者の手元の暦で選ぶものなので、端末の時刻に合わせる） */
const today = computed(() => {
  const d = new Date()
  return toYmd(d.getFullYear(), d.getMonth(), d.getDate())
})

/** 表示している月のマス（月初の曜日までは空き） */
const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1).getDay()
  const days = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const list: ({ day: number; ymd: string; weekday: number } | null)[] = Array(first).fill(null)
  for (let d = 1; d <= days; d++) {
    list.push({ day: d, ymd: toYmd(viewYear.value, viewMonth.value, d), weekday: (first + d - 1) % 7 })
  }
  return list
})

function toggle() {
  if (open.value) return close()
  // 選んである日の月から開く（空なら今月）
  const base = /^\d{4}-\d{2}-\d{2}$/.test(props.modelValue) ? new Date(`${props.modelValue}T00:00:00`) : new Date()
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
  open.value = true
}

function close() {
  open.value = false
}

function moveMonth(step: number) {
  const d = new Date(viewYear.value, viewMonth.value + step, 1)
  viewYear.value = d.getFullYear()
  viewMonth.value = d.getMonth()
}

function pick(ymd: string) {
  emit('update:modelValue', ymd)
  close()
}

// 欄の外を押したら閉じる
function onDocPointerDown(e: PointerEvent) {
  if (open.value && root.value && !root.value.contains(e.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointerDown))
</script>

<style scoped>
.kk-date {
  position: relative;
}
.kk-date-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  text-align: left;
  cursor: pointer;
}
.kk-date-box.is-empty {
  color: var(--kk-ink-faint);
}
.kk-date-box svg {
  flex: none;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: var(--kk-ink-soft);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-date-pop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 70;
  width: 248px;
  padding: 0.5rem;
  background: var(--kk-panel);
  border: 1px solid var(--kk-line);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(20, 60, 120, 0.18);
}
.kk-date-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.3rem;
}
.kk-date-month {
  font-size: 13px;
  font-weight: 700;
}
.kk-date-nav {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--kk-ink-soft);
  cursor: pointer;
}
.kk-date-nav:hover {
  background: var(--kk-accent-soft);
  color: var(--kk-accent-strong);
}
.kk-date-nav svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.kk-date-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.kk-date-wd {
  text-align: center;
  font-size: 10.5px;
  font-weight: 700;
  color: var(--kk-ink-faint);
  padding-bottom: 2px;
}
.kk-date-day {
  height: 30px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--kk-ink);
  cursor: pointer;
}
.kk-date-day:hover {
  background: var(--kk-accent-soft);
}
.is-sun {
  color: #c0392b;
}
.is-sat {
  color: var(--kk-accent);
}
.kk-date-day.is-today {
  box-shadow: inset 0 0 0 1px var(--kk-accent);
}
.kk-date-day.is-selected {
  background: var(--kk-accent);
  color: #fff;
  font-weight: 700;
}
.kk-date-foot {
  display: flex;
  justify-content: space-between;
  margin-top: 0.3rem;
}
.kk-date-link {
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: var(--kk-accent-strong);
  cursor: pointer;
  padding: 0.2rem 0.4rem;
}
</style>
