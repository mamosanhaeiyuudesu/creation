import { ref } from 'vue'

/**
 * 重要タスクのメール通知（アラート）設定。
 * 本番は D1（/api/task/alert）に保存、dev は D1 が使えないので localStorage に持つ。
 * useTaskProfiles と同じ dev/本番の切り分け方。
 */

const LS_ALERT_DEV = 'task_alert_dev'

export interface AlertSettings {
  enabled: boolean
  email: string
  /** JST の送信時刻（0-23）。複数指定可 */
  hours: number[]
}

export function emptyAlert(): AlertSettings {
  return { enabled: false, email: '', hours: [] }
}

export function useTaskAlert() {
  const alert = ref<AlertSettings>(emptyAlert())
  const loading = ref(false)
  const saving = ref(false)
  const testing = ref(false)
  const error = ref('')
  const testResult = ref('')

  function normalize(raw: Partial<AlertSettings> | null): AlertSettings {
    return {
      enabled: !!raw?.enabled,
      email: raw?.email ?? '',
      hours: [...new Set((raw?.hours ?? []).filter(h => Number.isInteger(h) && h >= 0 && h <= 23))].sort((a, b) => a - b),
    }
  }

  async function load() {
    loading.value = true
    error.value = ''
    testResult.value = ''
    try {
      if (import.meta.dev) {
        alert.value = normalize(JSON.parse(localStorage.getItem(LS_ALERT_DEV) ?? 'null'))
      } else {
        alert.value = normalize(await $fetch<AlertSettings>('/api/task/alert'))
      }
    } catch {
      alert.value = emptyAlert()
    } finally {
      loading.value = false
    }
  }

  async function save(next: AlertSettings): Promise<boolean> {
    saving.value = true
    error.value = ''
    try {
      const body = normalize(next)
      if (import.meta.dev) {
        localStorage.setItem(LS_ALERT_DEV, JSON.stringify(body))
      } else {
        await $fetch('/api/task/alert', { method: 'PUT', body })
      }
      alert.value = body
      return true
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || '保存に失敗しました'
      return false
    } finally {
      saving.value = false
    }
  }

  async function sendTest(email: string) {
    testing.value = true
    error.value = ''
    testResult.value = ''
    try {
      if (import.meta.dev) {
        // dev は D1 もメール送信バインディングも無いので、実送信はできない
        testResult.value = 'dev環境ではテスト送信できません（デプロイ後に試してください）'
        return
      }
      const res = await $fetch<{ ok: boolean; count: number }>('/api/task/alert-test', { method: 'POST', body: { email } })
      testResult.value = `テストメールを送りました（重要タスク ${res.count}件）`
    } catch (e: any) {
      error.value = e?.data?.message || e?.message || 'テスト送信に失敗しました'
    } finally {
      testing.value = false
    }
  }

  return { alert, loading, saving, testing, error, testResult, load, save, sendTest }
}
