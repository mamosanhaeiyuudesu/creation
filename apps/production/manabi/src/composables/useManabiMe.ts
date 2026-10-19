import { ref } from 'vue'

/**
 * この端末の控え（localStorage）。ログインが無いので端末をまたいでは使えない。
 * 正解数の累計と、作成者として入れる名前。
 *
 * 正解数の累計：ログインが無いので端末をまたいでは数えない。
 * 問題集ごとの正解数を持ち、トップ右上の累計はその合計。同じ問題集は何度書いても1つ分。
 */
const CORRECT_KEY = 'manabi-correct-v1'
const NAME_KEY = 'manabi-name-v1'

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

export function useManabiTotalCorrect() {
  const load = () => {
    totalCorrect.value = sumCorrect()
  }
  return { totalCorrect, load }
}
