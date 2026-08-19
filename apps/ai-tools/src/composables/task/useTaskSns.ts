import { ref, computed } from 'vue'

/**
 * 投稿カウンター（Instagram / note）。
 * 日ごとの投稿数を持ち、ヘッダーには全期間の累計を出す（表示期間には連動しない）。
 * dev はD1が使えないので localStorage、本番は /api/task/sns に保存する（プロフィール設定と同じ方式）。
 */

export const SNS_PLATFORMS = [
  { key: 'instagram', label: 'インスタ', color: '#e1306c' },
  { key: 'note', label: 'note', color: '#41c9b4' },
  { key: 'facebook', label: 'Facebook', color: '#4f9cf5' },
] as const

export type SnsPlatformKey = (typeof SNS_PLATFORMS)[number]['key']
export type SnsDayCounts = Record<SnsPlatformKey, number>

const LS_DEV = 'task_sns_counts_dev'

export function emptyDayCounts(): SnsDayCounts {
  return { instagram: 0, note: 0, facebook: 0 }
}

export function useTaskSns() {
  // key: 'YYYY-MM-DD'
  const counts = ref<Record<string, SnsDayCounts>>({})
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')

  const totals = computed<SnsDayCounts>(() => {
    const sum = emptyDayCounts()
    for (const day of Object.values(counts.value)) {
      for (const p of SNS_PLATFORMS) sum[p.key] += day[p.key] || 0
    }
    return sum
  })

  const totalAll = computed(() => SNS_PLATFORMS.reduce((s, p) => s + totals.value[p.key], 0))

  function dayCounts(date: string): SnsDayCounts {
    return { ...emptyDayCounts(), ...counts.value[date] }
  }

  /** 月（'YYYY-MM'）の合計 */
  function monthTotals(ym: string): SnsDayCounts {
    const sum = emptyDayCounts()
    for (const [date, day] of Object.entries(counts.value)) {
      if (!date.startsWith(ym)) continue
      for (const p of SNS_PLATFORMS) sum[p.key] += day[p.key] || 0
    }
    return sum
  }

  function readDev(): Record<string, SnsDayCounts> {
    try {
      const parsed = JSON.parse(localStorage.getItem(LS_DEV) ?? '{}')
      return typeof parsed === 'object' && parsed ? parsed : {}
    } catch {
      return {}
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    try {
      if (import.meta.dev) {
        counts.value = readDev()
      } else {
        const rows = await $fetch<{ date: string; platform: SnsPlatformKey; count: number }[]>('/api/task/sns')
        const map: Record<string, SnsDayCounts> = {}
        for (const r of rows) {
          const day = map[r.date] ?? emptyDayCounts()
          day[r.platform] = r.count
          map[r.date] = day
        }
        counts.value = map
      }
    } catch (e: any) {
      error.value = e?.data?.message || '投稿数の読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  /** 1日ぶんを保存。0件になった日は記録から落とす。 */
  async function save(date: string, values: SnsDayCounts) {
    const normalized = emptyDayCounts()
    for (const p of SNS_PLATFORMS) {
      const n = Math.round(Number(values[p.key]) || 0)
      normalized[p.key] = Math.max(0, Math.min(9999, n))
    }

    const prev = counts.value[date]
    const next = { ...counts.value }
    if (SNS_PLATFORMS.every(p => normalized[p.key] === 0)) delete next[date]
    else next[date] = normalized
    counts.value = next

    saving.value = true
    error.value = ''
    try {
      if (import.meta.dev) {
        localStorage.setItem(LS_DEV, JSON.stringify(counts.value))
      } else {
        await $fetch('/api/task/sns', { method: 'PUT', body: { date, counts: normalized } })
      }
    } catch (e: any) {
      // 保存できなかったぶんは画面の数字も戻す（累計がずれたまま残らないように）
      const reverted = { ...counts.value }
      if (prev) reverted[date] = prev
      else delete reverted[date]
      counts.value = reverted
      error.value = e?.data?.message || '保存に失敗しました'
    } finally {
      saving.value = false
    }
  }

  return { counts, totals, totalAll, loading, saving, error, dayCounts, monthTotals, load, save }
}
