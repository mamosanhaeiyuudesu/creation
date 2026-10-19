// nikki の画面状態。ページと各コンポーネントで同じ状態を触るので useState に置く。
//
// サーバーとのやりとりはここに閉じる（コンポーネント側に $fetch を散らさない）。

import { todayJST } from '~/utils/jst'
import type { NikkiDictionaryEntry } from '~/utils/nikki-dictionary'
import type { NikkiCalendarOption, NikkiDay, NikkiEntry, NikkiEvent, NikkiTopic } from '~/types/nikki'

interface StatusResponse {
  connected: boolean
  calendarIds: string[]
  configured: boolean
}

/** タイムラインの初回読み込み／追い読み1回で足す日数 */
const TIMELINE_PAGE = 14

function monthOf(date: string): string {
  return date.slice(0, 7)
}

export function useNikki() {
  const status = useState<StatusResponse>('nikki-status', () => ({ connected: false, calendarIds: [], configured: true }))
  const calendars = useState<NikkiCalendarOption[]>('nikki-calendars', () => [])

  const month = useState<string>('nikki-month', () => todayJST().slice(0, 7))
  const marks = useState<string[]>('nikki-marks', () => [])
  const monthEvents = useState<NikkiEvent[]>('nikki-month-events', () => [])
  const monthLoading = useState<boolean>('nikki-month-loading', () => false)

  const days = useState<NikkiDay[]>('nikki-days', () => [])
  const timelineLoading = useState<boolean>('nikki-timeline-loading', () => false)
  const hasMore = useState<boolean>('nikki-has-more', () => false)

  const selectedDate = useState<string>('nikki-selected', () => '')
  const entry = useState<NikkiEntry | null>('nikki-entry', () => null)
  const dayEvents = useState<NikkiEvent[]>('nikki-day-events', () => [])
  const dayLoading = useState<boolean>('nikki-day-loading', () => false)
  const saving = useState<boolean>('nikki-saving', () => false)
  const error = useState<string>('nikki-error', () => '')

  const dictionary = useState<NikkiDictionaryEntry[]>('nikki-dictionary', () => [])

  const today = computed(() => todayJST())

  function fail(e: any, fallback: string) {
    error.value = e?.statusMessage || e?.data?.message || e?.message || fallback
  }

  // ─────────────────────── 初期設定（Google連携） ───────────────────────

  async function loadStatus(): Promise<void> {
    try {
      status.value = await $fetch<StatusResponse>('/api/nikki/status')
    } catch (e) {
      fail(e, '連携状態を取得できませんでした')
    }
  }

  async function loadCalendars(): Promise<void> {
    if (!status.value.connected) return
    try {
      const res = await $fetch<{ calendars: NikkiCalendarOption[] }>('/api/nikki/calendars')
      calendars.value = res.calendars
    } catch (e) {
      fail(e, 'カレンダーの一覧を取得できませんでした')
    }
  }

  async function saveCalendars(ids: string[]): Promise<void> {
    try {
      const res = await $fetch<{ calendarIds: string[] }>('/api/nikki/calendars', {
        method: 'POST',
        body: { calendarIds: ids },
      })
      status.value = { ...status.value, calendarIds: res.calendarIds }
      calendars.value = calendars.value.map((c) => ({ ...c, selected: res.calendarIds.includes(c.id) }))
      await loadMonth()
    } catch (e) {
      fail(e, 'カレンダーの選択を保存できませんでした')
    }
  }

  async function disconnect(): Promise<void> {
    try {
      await $fetch('/api/nikki/google/disconnect', { method: 'POST' })
      status.value = { ...status.value, connected: false, calendarIds: [] }
      calendars.value = []
      monthEvents.value = []
      dayEvents.value = []
    } catch (e) {
      fail(e, '連携を解除できませんでした')
    }
  }

  // ─────────────────────── 文字起こし辞書 ───────────────────────

  async function loadDictionary(): Promise<void> {
    try {
      dictionary.value = (await $fetch<{ items: NikkiDictionaryEntry[] }>('/api/nikki/dictionary')).items
    } catch (e) {
      fail(e, '辞書を取得できませんでした')
    }
  }

  /** 追加・修正・削除はどれも更新後の一覧が返る */
  async function sendDictionary(url: string, method: 'POST' | 'PATCH' | 'DELETE', body?: { word: string }): Promise<boolean> {
    try {
      dictionary.value = (await $fetch<{ items: NikkiDictionaryEntry[] }>(url, { method, body })).items
      return true
    } catch (e) {
      fail(e, '辞書を保存できませんでした')
      return false
    }
  }

  const addDictionaryItem = (word: string) => sendDictionary('/api/nikki/dictionary', 'POST', { word })
  const updateDictionaryItem = (id: string, word: string) => sendDictionary(`/api/nikki/dictionary/${id}`, 'PATCH', { word })
  const removeDictionaryItem = (id: string) => sendDictionary(`/api/nikki/dictionary/${id}`, 'DELETE')

  // ─────────────────────────── 当月のカレンダー ───────────────────────────

  async function loadMonth(): Promise<void> {
    monthLoading.value = true
    try {
      const res = await $fetch<{ marks: string[]; events: NikkiEvent[] }>('/api/nikki/month', {
        query: { month: month.value },
      })
      marks.value = res.marks
      monthEvents.value = res.events
    } catch (e) {
      fail(e, '月の情報を取得できませんでした')
    } finally {
      monthLoading.value = false
    }
  }

  function shiftMonth(delta: number): void {
    const y = Number(month.value.slice(0, 4))
    const m = Number(month.value.slice(5, 7))
    const d = new Date(Date.UTC(y, m - 1 + delta, 1))
    month.value = d.toISOString().slice(0, 7)
  }

  // ───────────────────────────── タイムライン ─────────────────────────────

  async function loadTimeline(): Promise<void> {
    timelineLoading.value = true
    try {
      const res = await $fetch<{ days: NikkiDay[]; hasMore: boolean }>('/api/nikki/timeline', {
        query: { limit: TIMELINE_PAGE },
      })
      days.value = res.days
      hasMore.value = res.hasMore
    } catch (e) {
      fail(e, '日記の一覧を取得できませんでした')
    } finally {
      timelineLoading.value = false
    }
  }

  /** 左（過去）へスクロールしたときの追い読み。読み込んだ日数を返す（スクロール位置の補正に使う）。 */
  async function loadOlder(): Promise<number> {
    if (!hasMore.value || timelineLoading.value) return 0
    const oldest = days.value[days.value.length - 1]?.date
    if (!oldest) return 0
    timelineLoading.value = true
    try {
      const res = await $fetch<{ days: NikkiDay[]; hasMore: boolean }>('/api/nikki/timeline', {
        query: { before: oldest, limit: TIMELINE_PAGE },
      })
      days.value = [...days.value, ...res.days]
      hasMore.value = res.hasMore
      return res.days.length
    } catch (e) {
      fail(e, '過去の日記を読み込めませんでした')
      return 0
    } finally {
      timelineLoading.value = false
    }
  }

  /** 保存・編集のあとにタイムラインの当該日を差し替える（全体を読み直すとスクロール位置が飛ぶため）。 */
  function mergeDay(date: string, topics: NikkiTopic[], photos?: string[]): void {
    const idx = days.value.findIndex((d) => d.date === date)
    // photos を渡されなければ、すでにタイムラインにある写真を残す
    const next: NikkiDay = { date, topics, photos: photos ?? (idx >= 0 ? days.value[idx]!.photos : []), hasBody: true }
    if (idx >= 0) {
      days.value = days.value.map((d, i) => (i === idx ? next : d))
      return
    }
    // 新しい日付なら「新しい順」の並びを崩さない位置へ差し込む
    const at = days.value.findIndex((d) => d.date < date)
    const list = [...days.value]
    list.splice(at < 0 ? list.length : at, 0, next)
    days.value = list
    if (!marks.value.includes(date) && monthOf(date) === month.value) marks.value = [...marks.value, date]
  }

  // ───────────────────────────── 写真 ─────────────────────────────

  const photoBusy = ref(false)
  /** 写真まわりの失敗。ページ上部ではなく、押したカード／写真欄の近くに出すため日付ごと持つ */
  const photoError = ref<{ date: string; message: string } | null>(null)
  const errorText = (e: any, fallback: string) => e?.statusMessage || e?.data?.message || e?.message || fallback
  function setPhotoError(date: string, message: string): void {
    photoError.value = message ? { date, message } : null
  }

  /** サーバーが返した「その日の写真ID」を、開いている記録とタイムラインの両方へ反映する。 */
  function setPhotos(date: string, photos: string[]): void {
    if (entry.value?.date === date) entry.value = { ...entry.value, photos }
    const topics = days.value.find((d) => d.date === date)?.topics ?? (entry.value?.date === date ? entry.value.topics : [])
    mergeDay(date, topics, photos)
  }

  /** 縮小済みの data URL を順に送る（1枚ずつ＝途中で上限に当たっても入った分は残る）。 */
  async function addPhotos(date: string, dataUrls: string[]): Promise<void> {
    photoBusy.value = true
    setPhotoError(date, '')
    try {
      for (const dataUrl of dataUrls) {
        const res = await $fetch<{ photos: string[] }>('/api/nikki/photos', { method: 'POST', body: { date, dataUrl } })
        setPhotos(date, res.photos)
      }
    } catch (e) {
      setPhotoError(date, errorText(e, '写真を追加できませんでした'))
    } finally {
      photoBusy.value = false
    }
  }

  async function removePhoto(date: string, id: string): Promise<void> {
    photoBusy.value = true
    setPhotoError(date, '')
    try {
      const res = await $fetch<{ photos: string[] }>(`/api/nikki/photos/${id}`, { method: 'DELETE' })
      setPhotos(date, res.photos)
    } catch (e) {
      setPhotoError(date, errorText(e, '写真を消せませんでした'))
    } finally {
      photoBusy.value = false
    }
  }

  // ───────────────────────────── 1日ぶんの記録 ─────────────────────────────

  async function openDay(date: string): Promise<void> {
    selectedDate.value = date
    entry.value = null
    dayEvents.value = []
    dayLoading.value = true
    error.value = ''
    try {
      const res = await $fetch<{ entry: NikkiEntry; events: NikkiEvent[] }>(`/api/nikki/entries/${date}`)
      entry.value = res.entry
      dayEvents.value = res.events
    } catch (e) {
      fail(e, 'この日の記録を取得できませんでした')
    } finally {
      dayLoading.value = false
    }
  }

  function closeDay(): void {
    selectedDate.value = ''
    entry.value = null
    dayEvents.value = []
  }

  function applyEntry(updated: NikkiEntry): void {
    entry.value = updated
    mergeDay(updated.date, updated.topics, updated.photos)
  }

  /** 入力（音声の文字起こし／手打ち）を追記し、トピックを抜き出す。 */
  async function saveText(text: string, extract = true): Promise<boolean> {
    const date = selectedDate.value
    if (!date || !text.trim()) return false
    saving.value = true
    error.value = ''
    try {
      const res = await $fetch<{ entry: NikkiEntry }>(`/api/nikki/entries/${date}`, {
        method: 'PUT',
        body: { text, extract },
      })
      applyEntry(res.entry)
      return true
    } catch (e) {
      fail(e, '保存できませんでした')
      return false
    } finally {
      saving.value = false
    }
  }

  /** 全文からトピックを作り直す（手で直したものは残る）。 */
  async function reextract(): Promise<void> {
    const date = selectedDate.value
    if (!date) return
    saving.value = true
    error.value = ''
    try {
      const res = await $fetch<{ entry: NikkiEntry }>(`/api/nikki/entries/${date}/reextract`, { method: 'POST' })
      applyEntry(res.entry)
    } catch (e) {
      fail(e, 'トピックを作り直せませんでした')
    } finally {
      saving.value = false
    }
  }

  /** 重要トピックを自分で1件追加する（AIは通さない）。成功したら true。 */
  async function addTopic(input: { headline: string; detail: string; impact: number }): Promise<boolean> {
    const date = selectedDate.value
    if (!date) return false
    saving.value = true
    error.value = ''
    try {
      const res = await $fetch<{ entry: NikkiEntry }>(`/api/nikki/entries/${date}/topics`, { method: 'POST', body: input })
      applyEntry(res.entry)
      return true
    } catch (e) {
      fail(e, 'トピックを追加できませんでした')
      return false
    } finally {
      saving.value = false
    }
  }

  /** date を渡すと、日の記録を開いていなくてもタイムラインの該当日を更新する（トップから直接直す用）。 */
  async function patchTopic(id: string, patch: { headline: string; detail: string; impact: number }, date?: string): Promise<void> {
    saving.value = true
    try {
      const res = await $fetch<{ topics: NikkiTopic[] }>(`/api/nikki/topics/${id}`, { method: 'PATCH', body: patch })
      if (entry.value && (!date || entry.value.date === date)) applyEntry({ ...entry.value, topics: res.topics })
      else if (date) mergeDay(date, res.topics)
    } catch (e) {
      fail(e, 'トピックを直せませんでした')
    } finally {
      saving.value = false
    }
  }

  async function removeTopic(id: string, date?: string): Promise<void> {
    saving.value = true
    try {
      const res = await $fetch<{ topics: NikkiTopic[] }>(`/api/nikki/topics/${id}`, { method: 'DELETE' })
      if (entry.value && (!date || entry.value.date === date)) applyEntry({ ...entry.value, topics: res.topics })
      else if (date) mergeDay(date, res.topics)
    } catch (e) {
      fail(e, 'トピックを消せませんでした')
    } finally {
      saving.value = false
    }
  }

  return {
    status,
    calendars,
    month,
    marks,
    monthEvents,
    monthLoading,
    days,
    timelineLoading,
    hasMore,
    selectedDate,
    entry,
    dayEvents,
    dayLoading,
    saving,
    error,
    today,
    dictionary,
    loadDictionary,
    addDictionaryItem,
    updateDictionaryItem,
    removeDictionaryItem,
    loadStatus,
    loadCalendars,
    saveCalendars,
    disconnect,
    loadMonth,
    shiftMonth,
    loadTimeline,
    loadOlder,
    openDay,
    closeDay,
    saveText,
    reextract,
    addTopic,
    patchTopic,
    removeTopic,
    photoBusy,
    photoError,
    setPhotoError,
    addPhotos,
    removePhoto,
  }
}
