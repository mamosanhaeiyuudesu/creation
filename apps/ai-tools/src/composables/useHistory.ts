import { ref, watch, onMounted } from 'vue'
import type { HistoryItem } from '~/types/history'

export function useHistory(storageKey: string, app?: string) {
  const history = ref<HistoryItem[]>([])
  const copiedHistoryId = ref<string | null>(null)

  const copyHistory = async (item: HistoryItem) => {
    try {
      await navigator.clipboard.writeText(item.text)
      copiedHistoryId.value = item.id
      setTimeout(() => {
        copiedHistoryId.value = null
      }, 2000)
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  // ローカル開発またはappが未指定の場合はlocalStorageを使用
  if (import.meta.dev || !app) {
    onMounted(() => {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          history.value = parsed.map((item: any) => ({
            ...item,
            text: item.text ?? item.transcript ?? '',
            title: item.title ?? '',
          }))
        } catch {
          history.value = []
        }
      }
    })

    const saveHistory = () => {
      localStorage.setItem(storageKey, JSON.stringify(history.value))
    }

    const addHistory = (text: string, title: string): string => {
      const id = Date.now().toString()
      history.value.unshift({ id, timestamp: new Date().toISOString(), text, title })
      saveHistory()
      return id
    }

    const updateHistory = (id: string, text: string) => {
      const item = history.value.find((h) => h.id === id)
      if (item) {
        item.text = text
        saveHistory()
      }
    }

    const updateHistoryNotes = (id: string, notes: string) => {
      const item = history.value.find((h) => h.id === id)
      if (item) {
        item.notes = notes
        saveHistory()
      }
    }

    const updateHistoryTitle = (id: string, title: string) => {
      const item = history.value.find((h) => h.id === id)
      if (item) {
        item.title = title
        saveHistory()
      }
    }

    const deleteHistory = (id: string) => {
      history.value = history.value.filter((item) => item.id !== id)
      saveHistory()
    }

    return { history, copiedHistoryId, addHistory, updateHistory, updateHistoryNotes, updateHistoryTitle, deleteHistory, copyHistory }
  }

  // 本番環境: APIを使用
  const { isLoggedIn } = useAuth()

  const loadHistory = async () => {
    try {
      const data = await $fetch<HistoryItem[]>(`/api/app-history?app=${app}`)
      history.value = data
    } catch {
      history.value = []
    }
  }

  watch(
    isLoggedIn,
    (loggedIn) => {
      if (loggedIn) loadHistory()
      else history.value = []
    },
    { immediate: true }
  )

  const addHistory = (text: string, title: string): string => {
    const id = Date.now().toString()
    const timestamp = new Date().toISOString()
    history.value.unshift({ id, timestamp, text, title })
    $fetch('/api/app-history', {
      method: 'POST',
      body: { app, id, text, title, timestamp },
    }).catch(console.error)
    return id
  }

  const updateHistory = (id: string, text: string) => {
    const item = history.value.find((h) => h.id === id)
    if (item) {
      item.text = text
      $fetch(`/api/app-history/${id}`, { method: 'PATCH', body: { text } }).catch(console.error)
    }
  }

  const updateHistoryNotes = (id: string, notes: string) => {
    const item = history.value.find((h) => h.id === id)
    if (item) {
      item.notes = notes
      $fetch(`/api/app-history/${id}`, { method: 'PATCH', body: { notes } }).catch(console.error)
    }
  }

  const updateHistoryTitle = (id: string, title: string) => {
    const item = history.value.find((h) => h.id === id)
    if (item) {
      item.title = title
      $fetch(`/api/app-history/${id}`, { method: 'PATCH', body: { title } }).catch(console.error)
    }
  }

  const deleteHistory = (id: string) => {
    history.value = history.value.filter((item) => item.id !== id)
    $fetch(`/api/app-history/${id}`, { method: 'DELETE' }).catch(console.error)
  }

  return { history, copiedHistoryId, addHistory, updateHistory, updateHistoryNotes, updateHistoryTitle, deleteHistory, copyHistory }
}
