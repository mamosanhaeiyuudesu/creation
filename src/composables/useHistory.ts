import { ref, onMounted } from 'vue'
import type { HistoryItem } from '~/types/history'

export function useHistory(storageKey: string) {
  const history = ref<HistoryItem[]>([])
  const copiedHistoryId = ref<string | null>(null)

  onMounted(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // 旧フィールド名 (transcript) を新フィールド名 (text) に正規化
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

  const addHistory = (text: string, title: string) => {
    history.value.unshift({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      text,
      title,
    })
    saveHistory()
  }

  const deleteHistory = (id: string) => {
    history.value = history.value.filter((item) => item.id !== id)
    saveHistory()
  }

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

  return { history, copiedHistoryId, addHistory, deleteHistory, copyHistory }
}
