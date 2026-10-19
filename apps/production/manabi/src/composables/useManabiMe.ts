import { ref } from 'vue'

/**
 * この端末の「自分」の控え（localStorage だけ。ログインが無いので端末が本人の代わり）。
 * - ownerToken: 自分が作った問題の題名を変えるための合言葉。作るときにサーバーへ送り、サーバーはハッシュで持つ
 * - ownedIds: 自分が作った問題のID（題名変更のボタンを出すかどうかの判定）
 * - name: 作成者として表示する名前（次に作るときの入力済みにも使う）
 * - correct: 問題集ごとの正解数。トップ右上の累計はこの合計
 */
const TOKEN_KEY = 'manabi-owner-v1'
const OWNED_KEY = 'manabi-owned-v1'
const NAME_KEY = 'manabi-name-v1'
const CORRECT_KEY = 'manabi-correct-v1'

function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function setItem(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* 保存できなくても使える */
  }
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function ownerToken(): string {
  const cur = getItem(TOKEN_KEY)
  if (cur && /^[a-zA-Z0-9]{16,64}$/.test(cur)) return cur
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  setItem(TOKEN_KEY, token)
  return token
}

export function rememberOwned(id: string) {
  const list = readJson<string[]>(OWNED_KEY, [])
  if (!list.includes(id)) setItem(OWNED_KEY, JSON.stringify([...list, id]))
}

export function isOwned(id: string): boolean {
  return readJson<string[]>(OWNED_KEY, []).includes(id)
}

export function savedName(): string {
  return getItem(NAME_KEY) ?? ''
}

export function saveName(name: string) {
  setItem(NAME_KEY, name)
}

const totalCorrect = ref(0)

function sumCorrect(): number {
  const map = readJson<Record<string, number>>(CORRECT_KEY, {})
  return Object.values(map).reduce((a, n) => a + (Number.isFinite(n) ? n : 0), 0)
}

/** その問題集の正解数を記録する（同じ問題集は何度書いても1つ分。二重に数えない） */
export function recordCorrect(id: string, correct: number) {
  const map = readJson<Record<string, number>>(CORRECT_KEY, {})
  map[id] = correct
  setItem(CORRECT_KEY, JSON.stringify(map))
  totalCorrect.value = sumCorrect()
}

export function useManabiTotalCorrect() {
  const load = () => {
    totalCorrect.value = sumCorrect()
  }
  return { totalCorrect, load }
}
