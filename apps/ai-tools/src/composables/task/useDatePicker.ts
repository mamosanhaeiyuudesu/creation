import { ref } from 'vue'
import type { Ref } from 'vue'

type PickerTarget = 'start' | 'end'
type YearMonth = { year: number; month: number } // month: 0-11

export function useDatePicker(startDate: Ref<string>, endDate: Ref<string>) {
  const pickerOpen = ref<PickerTarget | null>(null)
  const showMobilePeriod = ref(false)

  function toYearMonth(dateStr: string): YearMonth {
    if (!dateStr) {
      const now = nowJST()
      return { year: now.getUTCFullYear(), month: now.getUTCMonth() }
    }
    const [y, m] = dateStr.split('-').map(Number)
    return { year: y, month: m - 1 }
  }

  const viewStart = ref<YearMonth>(toYearMonth(startDate.value))
  const viewEnd = ref<YearMonth>(toYearMonth(endDate.value))

  function view(t: PickerTarget) {
    return t === 'start' ? viewStart : viewEnd
  }

  function resetView(t: PickerTarget) {
    view(t).value = toYearMonth(t === 'start' ? startDate.value : endDate.value)
  }

  function formatDateLabel(val: string) {
    if (!val) return '指定なし'
    const [y, m, d] = val.split('-').map(Number)
    const day = ['日', '月', '火', '水', '木', '金', '土'][new Date(y, m - 1, d).getDay()]
    return `${y}/${m}/${d}(${day})`
  }

  function formatDateShort(val: string) {
    if (!val) return '今週末'
    const [, m, d] = val.split('-').map(Number)
    return `${m}/${d}`
  }

  function toggleMobilePeriod() {
    if (showMobilePeriod.value) {
      showMobilePeriod.value = false
    } else {
      resetView('start')
      resetView('end')
      showMobilePeriod.value = true
    }
  }

  function togglePicker(t: PickerTarget) {
    if (pickerOpen.value === t) {
      pickerOpen.value = null
    } else {
      resetView(t)
      pickerOpen.value = t
    }
  }

  function monthLabel(t: PickerTarget) {
    const v = view(t).value
    return `${v.year}年${v.month + 1}月`
  }

  function prevMonth(t: PickerTarget) {
    const v = view(t)
    v.value = v.value.month === 0 ? { year: v.value.year - 1, month: 11 } : { year: v.value.year, month: v.value.month - 1 }
  }

  function nextMonth(t: PickerTarget) {
    const v = view(t)
    v.value = v.value.month === 11 ? { year: v.value.year + 1, month: 0 } : { year: v.value.year, month: v.value.month + 1 }
  }

  function gridDays(t: PickerTarget): (number | null)[] {
    const { year, month } = view(t).value
    const firstDow = new Date(year, month, 1).getDay()
    const offset = (firstDow + 6) % 7 // 月曜始まり
    const total = new Date(year, month + 1, 0).getDate()
    const cells: (number | null)[] = Array(offset).fill(null)
    for (let d = 1; d <= total; d++) cells.push(d)
    return cells
  }

  function selectDay(t: PickerTarget, day: number) {
    const { year, month } = view(t).value
    const val = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (t === 'start') startDate.value = val
    else endDate.value = val
    pickerOpen.value = null
  }

  function clearEnd() {
    endDate.value = ''
    pickerOpen.value = null
  }

  function isSelectedDay(t: PickerTarget, day: number | null) {
    if (day === null) return false
    const { year, month } = view(t).value
    const current = t === 'start' ? startDate.value : endDate.value
    return current === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isTodayDay(t: PickerTarget, day: number | null) {
    if (day === null) return false
    const { year, month } = view(t).value
    const now = nowJST()
    return now.getUTCFullYear() === year && now.getUTCMonth() === month && now.getUTCDate() === day
  }

  return {
    pickerOpen, showMobilePeriod,
    formatDateLabel, formatDateShort,
    toggleMobilePeriod, togglePicker,
    monthLabel, prevMonth, nextMonth, gridDays,
    selectDay, isSelectedDay, isTodayDay, clearEnd,
  }
}
