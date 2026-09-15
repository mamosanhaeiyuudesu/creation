import { ref } from 'vue'
import type { KoubaSubtask } from '~/types/kouba'

/**
 * kouba の「サブタスク」（"今のテーマ"の下の一覧）。板（`useKouba`）・テーマ（`useKoubaTheme`）・
 * 達成したこと（`useKoubaAchievements`）とは別に読み書きする＝タスクに紐付かない分（taskId が null）も
 * 扱うため、板の入れ子（カテゴリ→ジョブ→タスク）を辿らずに独立の一覧として持つ。
 * **DONEの切り替え・削除は紐づくタスクの時間（板側のデータ）にも影響する**ので、呼び出し側（ページ）が
 * 続けて `useKouba().load()` を呼んで板を取り直すこと（このcomposable自身は板を触らない）。
 */
export function useKoubaSubtasks() {
  const subtasks = ref<KoubaSubtask[]>([])
  const loading = ref(true)
  const saving = ref(false)
  const error = ref('')

  // 時間の +/- の保存待ち（タスクの時間と同じ考え方＝押すたびにPATCH+一覧の再読込をすると連打で重いので、
  // 手元だけその場で書き換え、サーバーへの保存は最後の操作から少し待ってまとめて1回だけ送る）。
  const HOURS_SAVE_DELAY_MS = 700
  const pendingHourSaves = new Map<string, { hours: number; timer: ReturnType<typeof setTimeout> }>()

  async function load() {
    loading.value = true
    error.value = ''
    try {
      subtasks.value = await $fetch<KoubaSubtask[]>('/api/kouba/subtasks')
    } catch (e: any) {
      error.value = e?.data?.message || '読み込みに失敗しました'
    } finally {
      loading.value = false
    }
  }

  async function withSaving(fn: () => Promise<void>): Promise<boolean> {
    // 他の操作の前に、時間の保存待ちを送り切る（先に送らないと未保存の時間が古い値に巻き戻って見える）。
    await flushPendingHours()
    saving.value = true
    error.value = ''
    let ok = true
    try {
      await fn()
    } catch (e: any) {
      error.value = e?.data?.message || '保存に失敗しました'
      ok = false
    } finally {
      saving.value = false
    }
    return ok
  }

  /** 追加。成功したら true を返す（呼び出し側の「続けて入力しますか？」の判定に使う）。 */
  async function add(payload: { taskId: string | null; title: string; hours: number }): Promise<boolean> {
    return await withSaving(async () => {
      const created = await $fetch<KoubaSubtask>('/api/kouba/subtasks', { method: 'POST', body: payload })
      subtasks.value = [created, ...subtasks.value]
    })
  }

  async function rename(id: string, title: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { title } })
      const s = subtasks.value.find((s) => s.id === id)
      if (s) s.title = title
    })
  }

  /**
   * 時間の +/-。画面はその場で書き換え、サーバーへの保存だけ HOURS_SAVE_DELAY_MS 待ってまとめる
   * （タスクの `useKouba().setTaskHours` と同じやり方。押すたびの一覧再読込はしない）。
   */
  function setHours(id: string, hours: number) {
    const s = subtasks.value.find((s) => s.id === id)
    if (s) s.hours = hours

    const pending = pendingHourSaves.get(id)
    if (pending) clearTimeout(pending.timer)
    pendingHourSaves.set(id, { hours, timer: setTimeout(() => void flushHours(id), HOURS_SAVE_DELAY_MS) })
  }

  /** 保存待ちの時間を1件だけ送る。失敗したら手元の値が嘘になるので一覧を取り直す。 */
  async function flushHours(id: string) {
    const pending = pendingHourSaves.get(id)
    if (!pending) return
    clearTimeout(pending.timer)
    pendingHourSaves.delete(id)
    try {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { hours: pending.hours } })
    } catch (e: any) {
      error.value = e?.data?.message || '保存に失敗しました'
      await load()
    }
  }

  /** 保存待ちの時間をすべて送り切る。**ページを離れるとき・他の操作の前**に呼ぶ。 */
  async function flushPendingHours(): Promise<void> {
    if (!pendingHourSaves.size) return
    await Promise.all([...pendingHourSaves.keys()].map((id) => flushHours(id)))
  }

  /** DONE/未DONEの切り替え。サーバー側が紐づくタスクの時間へ増減を反映する（呼び出し側で板の再読込も必要）。 */
  async function toggleDone(id: string, done: boolean): Promise<boolean> {
    return await withSaving(async () => {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'PATCH', body: { done } })
      const s = subtasks.value.find((s) => s.id === id)
      if (s) {
        s.done = done
        s.doneAt = done ? new Date().toISOString() : null
      }
    })
  }

  async function remove(id: string) {
    await withSaving(async () => {
      await $fetch(`/api/kouba/subtasks/${id}`, { method: 'DELETE' })
      subtasks.value = subtasks.value.filter((s) => s.id !== id)
    })
  }

  return { subtasks, loading, saving, error, load, add, rename, setHours, flushPendingHours, toggleDone, remove }
}
