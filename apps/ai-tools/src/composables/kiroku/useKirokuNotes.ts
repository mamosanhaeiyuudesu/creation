import { computed, onMounted, ref } from 'vue'

/**
 * kiroku の記録は端末の中だけに置く。
 * サーバーにも D1 にも送らない（感情の記録が外に出ない安心感が、このアプリの前提）。
 */
export type KirokuNote = {
  id: string
  text: string
  createdAt: number // epoch ms
  updatedAt?: number
}

const NOTES_KEY = 'kiroku-notes-v1'
const DRAFT_KEY = 'kiroku-draft-v1'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

/** ローカルの暦での日付キー（YYYY-MM-DD）。UTC にすると日付境界がずれるので手で組む。 */
export function dateKey(ts: number): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** 日付見出し。近い日は「今日」「昨日」で、それ以外は年月日と曜日。 */
export function formatDateLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const today = new Date()
  const todayKey = dateKey(today.getTime())
  if (key === todayKey) return '今日'
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1)
  if (key === dateKey(yesterday.getTime())) return '昨日'
  return `${y}年${m}月${d}日（${WEEKDAYS[date.getDay()]}）`
}

export type KirokuGroup = {
  key: string
  label: string
  notes: KirokuNote[]
}

/** 新しい順に並んだメモを、日付ごとの塊にまとめる。 */
export function groupByDate(notes: KirokuNote[]): KirokuGroup[] {
  const groups: KirokuGroup[] = []
  let current: KirokuGroup | null = null
  for (const note of notes) {
    const key = dateKey(note.createdAt)
    if (!current || current.key !== key) {
      current = { key, label: formatDateLabel(key), notes: [] }
      groups.push(current)
    }
    current.notes.push(note)
  }
  return groups
}

/** セッションで一緒に読み返すためのテキスト。古い順に並べ直して読み物にする。 */
export function buildExportText(notes: KirokuNote[], rangeLabel: string): string {
  const asc = [...notes].sort((a, b) => a.createdAt - b.createdAt)
  const lines: string[] = ['kiroku の記録', `${rangeLabel}（${asc.length}件）`, '']
  let lastKey = ''
  for (const note of asc) {
    const key = dateKey(note.createdAt)
    if (key !== lastKey) {
      const [y, m, d] = key.split('-').map(Number)
      const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()]
      lines.push(`── ${y}年${m}月${d}日（${wd}）`, '')
      lastKey = key
    }
    lines.push(formatTime(note.createdAt), note.text.trim(), '')
  }
  return lines.join('\n').trimEnd() + '\n'
}

function readNotes(): KirokuNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((n: any) => n && typeof n.text === 'string' && typeof n.createdAt === 'number')
      .map((n: any) => ({
        id: String(n.id ?? `${n.createdAt}`),
        text: n.text,
        createdAt: n.createdAt,
        updatedAt: typeof n.updatedAt === 'number' ? n.updatedAt : undefined,
      }))
  } catch {
    // 壊れたデータでアプリごと止めない。読めなければ空として扱う（上書きはしない）。
    return []
  }
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useKirokuNotes() {
  const notes = ref<KirokuNote[]>([])
  const loaded = ref(false)
  const storageError = ref('')

  const load = () => {
    notes.value = readNotes()
    loaded.value = true
  }

  // localStorage はクライアントにしか無いので、必ずマウント後に読む。
  onMounted(load)

  const persist = () => {
    try {
      localStorage.setItem(NOTES_KEY, JSON.stringify(notes.value))
      storageError.value = ''
      return true
    } catch {
      storageError.value = 'この端末に保存できませんでした。ブラウザの空き容量をご確認ください。'
      return false
    }
  }

  /** 新しい順。表示はすべてこちらを使う。 */
  const sorted = computed(() => [...notes.value].sort((a, b) => b.createdAt - a.createdAt))
  const total = computed(() => notes.value.length)
  /** 記録のある日（カレンダーの印用） */
  const recordedDays = computed(() => new Set(notes.value.map((n) => dateKey(n.createdAt))))

  const add = (text: string) => {
    const body = text.trim()
    if (!body) return false
    notes.value = [...notes.value, { id: newId(), text: body, createdAt: Date.now() }]
    return persist()
  }

  const update = (id: string, text: string) => {
    const body = text.trim()
    if (!body) return false
    notes.value = notes.value.map((n) => (n.id === id ? { ...n, text: body, updatedAt: Date.now() } : n))
    return persist()
  }

  const remove = (id: string) => {
    notes.value = notes.value.filter((n) => n.id !== id)
    return persist()
  }

  // 書きかけを端末に残しておく（間違えて閉じても消えないように）
  const readDraft = () => {
    try {
      return localStorage.getItem(DRAFT_KEY) ?? ''
    } catch {
      return ''
    }
  }
  const saveDraft = (text: string) => {
    try {
      if (text) localStorage.setItem(DRAFT_KEY, text)
      else localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* 下書きは保存できなくても書くこと自体は続けられる */
    }
  }

  return {
    notes,
    sorted,
    total,
    recordedDays,
    loaded,
    storageError,
    load,
    add,
    update,
    remove,
    readDraft,
    saveDraft,
  }
}
