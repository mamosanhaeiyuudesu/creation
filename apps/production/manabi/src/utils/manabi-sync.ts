// 端末間の引き継ぎ（同期コード）で行き来するデータの型・検査・統合。サーバーとブラウザで同じものを使う。
// 運ぶのは「名前・問題集ごとの正解数・これまでの問題の一覧」だけ。解答の途中経過（useManabiRun）は運ばない。
import { MANABI_CREATOR_NAME_MAX } from '~/types/manabi'

export interface ManabiSyncRecent {
  id: string
  title: string
  creatorName: string
  count: number
  answered: number
  lastScore: number | null
  openedAt: number
}

export interface ManabiSyncData {
  name: string
  /** 問題集のID → 正解数 */
  correct: Record<string, number>
  recent: ManabiSyncRecent[]
}

export const SYNC_RECENT_MAX = 30
const SYNC_CORRECT_MAX = 2000
const SET_ID = /^[a-zA-Z0-9]{10}$/

const int = (v: unknown, max: number): number | null =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max ? v : null

/** 外から来た値を安全な形に整える。形の合わないものは捨てる（サイズもここで頭打ちになる） */
export function sanitizeSyncData(raw: unknown): ManabiSyncData {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>
  const name = typeof src.name === 'string' ? src.name.trim().slice(0, MANABI_CREATOR_NAME_MAX) : ''

  const correct: Record<string, number> = {}
  if (src.correct && typeof src.correct === 'object') {
    for (const [id, n] of Object.entries(src.correct).slice(0, SYNC_CORRECT_MAX)) {
      const v = int(n, 100)
      if (SET_ID.test(id) && v !== null) correct[id] = v
    }
  }

  const recent: ManabiSyncRecent[] = []
  if (Array.isArray(src.recent)) {
    for (const r of src.recent.slice(0, SYNC_RECENT_MAX)) {
      if (!r || typeof r !== 'object' || typeof r.id !== 'string' || !SET_ID.test(r.id)) continue
      const count = int(r.count, 100)
      if (count === null) continue
      recent.push({
        id: r.id,
        title: typeof r.title === 'string' ? r.title.slice(0, 100) : '',
        creatorName: typeof r.creatorName === 'string' ? r.creatorName.slice(0, MANABI_CREATOR_NAME_MAX) : '',
        count,
        answered: int(r.answered, 100) ?? 0,
        lastScore: int(r.lastScore, 100),
        openedAt: typeof r.openedAt === 'number' && Number.isFinite(r.openedAt) ? r.openedAt : 0,
      })
    }
  }
  return { name, correct, recent }
}

/**
 * 2つを1つにまとめる（何度やっても、どちらを先にしても同じ結果＝同期が行き来しても増えも減りもしない）。
 * - 正解数: 問題集ごとに大きいほう
 * - 一覧: IDで和集合。同じ問題は新しく開いたほうを土台に、答えた数は大きいほう、点数はあるほう
 * - 名前: incoming が空でなければそちら（いま同期した端末の名前）
 */
export function mergeSyncData(stored: ManabiSyncData, incoming: ManabiSyncData): ManabiSyncData {
  const correct: Record<string, number> = { ...stored.correct }
  for (const [id, n] of Object.entries(incoming.correct)) correct[id] = Math.max(correct[id] ?? 0, n)

  const byId = new Map<string, ManabiSyncRecent>()
  for (const r of [...stored.recent, ...incoming.recent]) {
    const prev = byId.get(r.id)
    if (!prev) {
      byId.set(r.id, r)
      continue
    }
    const base = r.openedAt >= prev.openedAt ? r : prev
    byId.set(r.id, {
      ...base,
      answered: Math.max(r.answered, prev.answered),
      lastScore: base.lastScore ?? (base === r ? prev.lastScore : r.lastScore),
    })
  }
  const recent = [...byId.values()].sort((a, b) => b.openedAt - a.openedAt).slice(0, SYNC_RECENT_MAX)

  return { name: incoming.name || stored.name, correct, recent }
}

/** 入力されたコードを揃える（大文字・ハイフン・空白は気にしない） */
export function normalizeSyncCode(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]/g, '')
}

export const SYNC_CODE_LENGTH = 12

export function isValidSyncCode(code: string): boolean {
  return new RegExp(`^[a-z0-9]{${SYNC_CODE_LENGTH}}$`).test(code)
}

/** 読みやすく4文字ずつ区切る */
export function formatSyncCode(code: string): string {
  return code.replace(/(.{4})(?=.)/g, '$1-')
}
