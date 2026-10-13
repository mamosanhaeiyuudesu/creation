/**
 * 解いている途中・解き終えた直近の結果の控え（端末内だけ）。
 * 戻る・タブを閉じる・リンクを開き直す、のどれでも途中から再開でき、結果画面もあとから見返せる。
 * 解答はサーバーに送らない方針なので、置き場所は localStorage だけ（別の端末には引き継がれない）。
 */
export type ManabiPhase = 'intro' | 'quiz' | 'result'

export interface ManabiRun {
  phase: Exclude<ManabiPhase, 'intro'>
  /** 今回解く問題（set.questions の添字）。やり直しでは間違えた問題だけになる */
  order: number[]
  pos: number
  /** 問題の添字 → 選んだ選択肢 */
  picks: Record<number, number>
  reviewOnly: boolean
  savedAt: number
}

const PREFIX = 'manabi-run-v1:'

export const runKey = (id: string) => `${PREFIX}${id}`

export function readRun(id: string, questionCount: number): ManabiRun | null {
  try {
    const raw = localStorage.getItem(runKey(id))
    if (!raw) return null
    const r = JSON.parse(raw) as ManabiRun
    const okOrder =
      Array.isArray(r.order) && r.order.length > 0 && r.order.every((n) => Number.isInteger(n) && n >= 0 && n < questionCount)
    if (!okOrder || (r.phase !== 'quiz' && r.phase !== 'result') || !r.picks || typeof r.picks !== 'object') return null
    const pos = Number.isInteger(r.pos) ? Math.min(Math.max(r.pos, 0), r.order.length - 1) : 0
    return { ...r, pos, reviewOnly: !!r.reviewOnly }
  } catch {
    return null
  }
}

export function writeRun(id: string, run: ManabiRun) {
  try {
    localStorage.setItem(runKey(id), JSON.stringify(run))
  } catch {
    /* 保存できなくても解くことはできる */
  }
}

export function clearRun(id: string) {
  try {
    localStorage.removeItem(runKey(id))
  } catch {
    /* 何もしない */
  }
}
