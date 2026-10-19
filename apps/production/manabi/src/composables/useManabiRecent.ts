import { ref } from 'vue'

/**
 * 作った・開いた問題セットの控え（端末内だけ）。ログインが無いので、トップから
 * 「さっきの問題」に戻れる手がかりはこれしかない。問題そのものはサーバーにあるので id と表示用の文字だけ持つ。
 */
export interface ManabiRecent {
  id: string
  title: string
  /** 作った人の名前。無ければ空 */
  creatorName: string
  count: number
  /** ここまでに答えた問題数（途中でも「8/10」と出すため） */
  answered: number
  /** 解き終えたときの正答率（%）。まだ解き終えていなければ null */
  lastScore: number | null
  openedAt: number
}

const KEY = 'manabi-recent-v1'
const MAX = 30

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
  const touch = (entry: { id: string; title: string; creatorName: string; count: number }) => {
    const list = read()
    const prev = list.find((r) => r.id === entry.id)
    const next: ManabiRecent = {
      ...entry,
      answered: prev?.answered ?? 0,
      lastScore: prev?.lastScore ?? null,
      openedAt: Date.now(),
    }
    // 一覧から落ちても解答の控え（useManabiRun）は消さない。「1回しかできない」の記録を兼ねているため
    write([next, ...list.filter((r) => r.id !== entry.id)].slice(0, MAX))
  }

  /** 答えた数を更新する（1問答えるたびに呼ぶ） */
  const recordAnswered = (id: string, answered: number) => {
    write(read().map((r) => (r.id === id ? { ...r, answered } : r)))
  }

  const recordScore = (id: string, score: number) => {
    write(read().map((r) => (r.id === id ? { ...r, lastScore: score } : r)))
  }

  return { items, load, touch, recordAnswered, recordScore }
}
