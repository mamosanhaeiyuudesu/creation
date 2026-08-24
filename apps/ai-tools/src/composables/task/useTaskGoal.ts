import { ref } from 'vue'
import { nowJST } from '~/utils/jst'

/**
 * 今週の目標。週（月曜始まり・JST）ごとに自由記述テキストを1件持つ。
 * dev はD1が使えないので localStorage、本番は /api/task/goal に保存する（投稿カウンターと同じ方式）。
 */

const LS_DEV = 'task_weekly_goal_dev'

function mondayOfThisWeek(): string {
  const t = nowJST()
  const diffFromMonday = (t.getUTCDay() + 6) % 7
  const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() - diffFromMonday))
  return d.toISOString().slice(0, 10)
}

function readDev(): Record<string, string> {
  try {
    const parsed = JSON.parse(localStorage.getItem(LS_DEV) ?? '{}')
    return typeof parsed === 'object' && parsed ? parsed : {}
  } catch {
    return {}
  }
}

export function useTaskGoal() {
  const weekStart = mondayOfThisWeek()
  const goal = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  async function load() {
    loading.value = true
    error.value = ''
    try {
      if (import.meta.dev) {
        goal.value = readDev()[weekStart] ?? ''
      } else {
        const row = await $fetch<{ goal: string }>('/api/task/goal', { query: { weekStart } })
        goal.value = row?.goal ?? ''
      }
    } catch (e: any) {
      error.value = e?.data?.message || '目標の読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function save(value: string) {
    const trimmed = value.slice(0, 200)
    const prev = goal.value
    goal.value = trimmed
    saving.value = true
    error.value = ''
    try {
      if (import.meta.dev) {
        const map = readDev()
        if (trimmed.trim()) map[weekStart] = trimmed
        else delete map[weekStart]
        localStorage.setItem(LS_DEV, JSON.stringify(map))
      } else {
        await $fetch('/api/task/goal', { method: 'PUT', body: { weekStart, goal: trimmed } })
      }
    } catch (e: any) {
      goal.value = prev
      error.value = e?.data?.message || '保存に失敗しました'
    } finally {
      saving.value = false
    }
  }

  return { weekStart, goal, loading, saving, error, load, save }
}
