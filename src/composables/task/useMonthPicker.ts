import { ref } from 'vue'
import type { Ref } from 'vue'

type PickerTarget = 'start' | 'end'

export function useMonthPicker(startMonth: Ref<string>, endMonth: Ref<string>) {
  const pickerOpen = ref<PickerTarget | null>(null)
  const pickerYearStart = ref(parseInt(startMonth.value.split('-')[0]))
  const pickerYearEnd = ref(parseInt(endMonth.value.split('-')[0]))
  const showMobilePeriod = ref(false)

  function formatMonthLabel(val: string) {
    const [y, m] = val.split('-').map(Number)
    return `${y}年${m}月`
  }

  const formatMonthShort = formatMonthLabel

  function toggleMobilePeriod() {
    if (showMobilePeriod.value) {
      showMobilePeriod.value = false
    } else {
      pickerYearStart.value = parseInt(startMonth.value.split('-')[0])
      pickerYearEnd.value = parseInt(endMonth.value.split('-')[0])
      showMobilePeriod.value = true
    }
  }

  function togglePicker(t: PickerTarget) {
    if (pickerOpen.value === t) {
      pickerOpen.value = null
    } else {
      if (t === 'start') pickerYearStart.value = parseInt(startMonth.value.split('-')[0])
      else pickerYearEnd.value = parseInt(endMonth.value.split('-')[0])
      pickerOpen.value = t
    }
  }

  function prevYear(t: PickerTarget) {
    if (t === 'start') pickerYearStart.value--
    else pickerYearEnd.value--
  }

  function nextYear(t: PickerTarget) {
    if (t === 'start') pickerYearStart.value++
    else pickerYearEnd.value++
  }

  function selectMonth(t: PickerTarget, m: number) {
    const year = t === 'start' ? pickerYearStart.value : pickerYearEnd.value
    const val = `${year}-${String(m).padStart(2, '0')}`
    if (t === 'start') startMonth.value = val
    else endMonth.value = val
    pickerOpen.value = null
  }

  function isSelectedMonth(t: PickerTarget, m: number) {
    const current = t === 'start' ? startMonth.value : endMonth.value
    const year = t === 'start' ? pickerYearStart.value : pickerYearEnd.value
    return current === `${year}-${String(m).padStart(2, '0')}`
  }

  return {
    pickerOpen, pickerYearStart, pickerYearEnd, showMobilePeriod,
    formatMonthLabel, formatMonthShort,
    toggleMobilePeriod, togglePicker, prevYear, nextYear, selectMonth, isSelectedMonth,
  }
}
