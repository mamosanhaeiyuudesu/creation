import { ref } from 'vue'
import { MANABI_AUDIENCES, MANABI_COUNTS, type ManabiAudience, type ManabiCount } from '~/types/manabi'

/**
 * この端末の控え（localStorage）。ログインが無いので端末をまたいでは使えない。
 * 正解数の累計と、作成者として入れる名前。
 *
 * 正解数の累計：ログインが無いので端末をまたいでは数えない。
 * 問題集ごとの正解数を持ち、トップ右上の累計はその合計。同じ問題集は何度書いても1つ分。
 */
const CORRECT_KEY = 'manabi-correct-v1'
const NAME_KEY = 'manabi-name-v1'

/** 前回、問題を作るときに選んだ設定（対象・問題数・公開）。次回から選択済みにする。端末だけの控え */
const OPTIONS_KEY = 'manabi-options-v1'
export interface ManabiOptions {
  audience: ManabiAudience
  count: ManabiCount
  isPublic: boolean
}

export function savedOptions(): Partial<ManabiOptions> {
  try {
    const raw = JSON.parse(localStorage.getItem(OPTIONS_KEY) ?? '{}') ?? {}
    const out: Partial<ManabiOptions> = {}
    if ((MANABI_AUDIENCES as readonly string[]).includes(raw.audience)) out.audience = raw.audience
    if ((MANABI_COUNTS as readonly number[]).includes(raw.count)) out.count = raw.count
    if (typeof raw.isPublic === 'boolean') out.isPublic = raw.isPublic
    return out
  } catch {
    return {}
  }
}

export function saveOptions(opts: ManabiOptions) {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(opts))
  } catch {
    /* 保存できなくても使える */
  }
}

/** 前回、問題を作るときに入れた名前（次回から入力済みにする。端末だけの控え） */
export function savedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name)
  } catch {
    /* 保存できなくても使える */
  }
}

function readMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(CORRECT_KEY)
    return raw ? (JSON.parse(raw) as Record<string, number>) : {}
  } catch {
    return {}
  }
}

/** 問題集ごとの正解数（同期コードで他の端末と統合するときに読み書きする） */
export const readCorrectMap = readMap
export function writeCorrectMap(map: Record<string, number>) {
  try {
    localStorage.setItem(CORRECT_KEY, JSON.stringify(map))
  } catch {
    /* 保存できなくても使える */
  }
  totalCorrect.value = sumCorrect()
}

const totalCorrect = ref(0)

function sumCorrect(): number {
  return Object.values(readMap()).reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0)
}

export function recordCorrect(id: string, correct: number) {
  try {
    localStorage.setItem(CORRECT_KEY, JSON.stringify({ ...readMap(), [id]: correct }))
  } catch {
    /* 保存できなくても解ける */
  }
  totalCorrect.value = sumCorrect()
}

/** 累計正解数に応じた称号（10段階）。次の段階までの距離などは出さない（煽らないため） */
const RANKS: { min: number; name: string }[] = [
  { min: 0, name: '見習い' },
  { min: 5, name: '入門' },
  { min: 20, name: '初級' },
  { min: 50, name: '中級' },
  { min: 120, name: '上級' },
  { min: 300, name: '達人' },
  { min: 700, name: '師範' },
  { min: 1400, name: '博士' },
  { min: 2600, name: '賢者' },
  { min: 5000, name: '学聖' },
]

export function rankOf(correct: number): { level: number; name: string } {
  let level = 0
  RANKS.forEach((r, i) => {
    if (correct >= r.min) level = i
  })
  return { level: level + 1, name: RANKS[level]?.name ?? '' }
}

export function useManabiTotalCorrect() {
  const load = () => {
    totalCorrect.value = sumCorrect()
  }
  return { totalCorrect, load }
}
