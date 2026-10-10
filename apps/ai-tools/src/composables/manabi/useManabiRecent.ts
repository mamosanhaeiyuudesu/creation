import { ref } from 'vue'
import { clearRun } from '~/composables/manabi/useManabiRun'

/**
 * 作った・開いた問題セットの控え（端末内だけ）。ログインが無いので、トップから
 * 「さっきの問題」に戻れる手がかりはこれしかない。問題そのものはサーバーにあるので id と表示用の文字だけ持つ。
 */
export interface ManabiRecent {
  id: string
  title: string
  count: number
  /** 最後に解き終えたときの正答率（%）。まだ解き終えていなければ null */
  lastScore: number | null
  openedAt: number
}

const KEY = 'manabi-recent-v1'
const MAX = 8

const items = ref<ManabiRecent[]>([])

function read(): ManabiRecent[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(list: ManabiRecent[]) {
  items.value = list
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* 保存できなくても解くことはできる */
  }
}

export function useManabiRecent() {
  const load = () => {
    items.value = read()
  }

  /** 開いたセットを先頭に置く（既にあれば点数は引き継ぐ） */
  const touch = (entry: { id: string; title: string; count: number }) => {
    const list = read()
    const prev = list.find((r) => r.id === entry.id)
    const next: ManabiRecent = { ...entry, lastScore: prev?.lastScore ?? null, openedAt: Date.now() }
    const merged = [next, ...list.filter((r) => r.id !== entry.id)]
    // 「最近」から落ちた問題の途中経過も一緒に消す（端末に溜め続けない）
    for (const dropped of merged.slice(MAX)) clearRun(dropped.id)
    write(merged.slice(0, MAX))
  }

  const recordScore = (id: string, score: number) => {
    write(read().map((r) => (r.id === id ? { ...r, lastScore: score } : r)))
  }

  return { items, load, touch, recordScore }
}
