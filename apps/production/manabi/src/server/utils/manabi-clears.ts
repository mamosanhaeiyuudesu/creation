// 問題集ごとの「クリアされた回数」。ログインが無いので、端末のランダムID（イイねと同じ voter）を1人とみなし、
// (set_id, voter) が主キー＝同じ人が同じ問題集で2回数えられることはない。
let ensured: Promise<void> | null = null

/** テーブルを（無ければ）用意する。005_clears.sql と同じ内容。D1 の exec() は使わず prepare().run() で流す */
export function ensureClearsTable(db: any): Promise<void> {
  ensured ??= db
    .prepare(
      `CREATE TABLE IF NOT EXISTS manabi_clears (
        set_id TEXT NOT NULL, voter TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), PRIMARY KEY (set_id, voter)
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

// dev（D1 無し）はプロセス内に置く。setId → voter の集合
export const devClears: Map<string, Set<string>> = ((globalThis as any).__manabiClearsStore ??= new Map())

export async function countClears(db: any | null, setId: string): Promise<number> {
  if (!db) return devClears.get(setId)?.size ?? 0
  const row = await db.prepare('SELECT COUNT(*) AS n FROM manabi_clears WHERE set_id = ?').bind(setId).first()
  return row?.n ?? 0
}

/** クリアを記録して最新の回数を返す。同じ人が2回目に送っても増えない */
export async function addClear(db: any | null, setId: string, voter: string): Promise<number> {
  if (!db) {
    const s = devClears.get(setId) ?? new Set<string>()
    s.add(voter)
    devClears.set(setId, s)
    return s.size
  }
  await db.prepare('INSERT OR IGNORE INTO manabi_clears (set_id, voter) VALUES (?, ?)').bind(setId, voter).run()
  return countClears(db, setId)
}
