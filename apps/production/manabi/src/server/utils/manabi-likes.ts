// 問題ごとの「イイね」。ログインが無いので、端末が作ったランダムID（voter）を1人とみなす。
// (set_id, q_index, voter) が主キーなので、同じ人が同じ問題に付けられるのは1回だけ（取り消しも無い）。
import { MANABI_LIKE_VOTER_PATTERN } from '~/types/manabi'

let ensured: Promise<void> | null = null

/** テーブルを（無ければ）用意する。004_likes.sql と同じ内容。D1 の exec() は使わず prepare().run() で流す */
export function ensureLikesTable(db: any): Promise<void> {
  ensured ??= db
    .prepare(
      `CREATE TABLE IF NOT EXISTS manabi_likes (
        set_id TEXT NOT NULL, q_index INTEGER NOT NULL, voter TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (set_id, q_index, voter)
      )`
    )
    .run()
    .then(() => {})
    .catch((e: unknown) => {
      ensured = null
      throw e
    })
  return ensured!
}

export function isValidVoter(v: unknown): v is string {
  return typeof v === 'string' && MANABI_LIKE_VOTER_PATTERN.test(v)
}

// dev（D1 無し）はプロセス内に置く。キーは `${setId}:${q}` → voter の集合
const devStore: Map<string, Set<string>> = ((globalThis as any).__manabiLikesStore ??= new Map())

export interface LikeState {
  /** 問題の添字 → イイね数（0件は含まない） */
  counts: Record<number, number>
  /** voter がすでに押した問題の添字 */
  mine: number[]
}

export async function loadLikes(db: any | null, setId: string, voter: string | null): Promise<LikeState> {
  const counts: Record<number, number> = {}
  const mine: number[] = []
  if (!db) {
    for (const [key, voters] of devStore) {
      if (!key.startsWith(`${setId}:`)) continue
      const q = Number(key.slice(setId.length + 1))
      counts[q] = voters.size
      if (voter && voters.has(voter)) mine.push(q)
    }
    return { counts, mine }
  }
  const { results } = await db
    .prepare('SELECT q_index, COUNT(*) AS n FROM manabi_likes WHERE set_id = ? GROUP BY q_index')
    .bind(setId)
    .all()
  for (const r of results ?? []) counts[r.q_index] = r.n
  if (voter) {
    const m = await db.prepare('SELECT q_index FROM manabi_likes WHERE set_id = ? AND voter = ?').bind(setId, voter).all()
    for (const r of m.results ?? []) mine.push(r.q_index)
  }
  return { counts, mine }
}

/** イイねを付けて、その問題の最新の件数を返す。すでに押していれば何もしない */
export async function addLike(db: any | null, setId: string, q: number, voter: string): Promise<number> {
  if (!db) {
    const key = `${setId}:${q}`
    const set = devStore.get(key) ?? new Set<string>()
    set.add(voter)
    devStore.set(key, set)
    return set.size
  }
  await db.prepare('INSERT OR IGNORE INTO manabi_likes (set_id, q_index, voter) VALUES (?, ?, ?)').bind(setId, q, voter).run()
  const row = await db.prepare('SELECT COUNT(*) AS n FROM manabi_likes WHERE set_id = ? AND q_index = ?').bind(setId, q).first()
  return row?.n ?? 1
}
