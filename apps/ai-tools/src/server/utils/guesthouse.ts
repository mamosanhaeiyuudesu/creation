// ゲストハウス案内アプリ (guesthouse) のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、宿は user_id でスコープする。
// 共有リンクは share_token で公開し、ログイン不要でお客様がチャットにアクセスできる。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import type { GuestFact, House, HouseSummary } from '~/types/guesthouse'

export interface GuesthouseUser {
  id: string
  username: string
}

/** guesthouse 用テーブルを（無ければ）用意する。dev/未マイグレーション環境向けの保険。 */
export async function ensureGuesthouseTables(db: any): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_houses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL DEFAULT '',
      welcome TEXT NOT NULL DEFAULT '', share_token TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).catch(() => {})
  await db.exec(`
    CREATE TABLE IF NOT EXISTS guesthouse_facts (
      id TEXT PRIMARY KEY, house_id TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
      title TEXT NOT NULL DEFAULT '', body TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    )
  `).catch(() => {})
}

/** ログイン必須。未ログインなら 401。 */
export async function requireGuesthouseUser(event: any): Promise<GuesthouseUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無ければ 503。 */
export function requireGuesthouseDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/** 共有リンク用トークン（推測困難な32文字）。 */
export function makeGuesthouseShareToken(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

// ── 整形 ──────────────────────────────

interface HouseRow {
  id: string
  name: string
  welcome: string
  share_token: string
  created_at: string
  updated_at: string
}
interface FactRow {
  id: string
  house_id: string
  category: string
  title: string
  body: string
  sort_order: number
}

function shapeFact(row: FactRow): GuestFact {
  return { id: row.id, category: row.category, title: row.title, body: row.body }
}

function shapeHouse(row: HouseRow, facts: FactRow[]): House {
  return {
    id: row.id,
    name: row.name,
    welcome: row.welcome,
    shareToken: row.share_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    facts: facts.map(shapeFact),
  }
}

/** 一覧用サマリ（案内本文は含めず件数だけ）。 */
export async function loadHouseSummaries(db: any, userId: string): Promise<HouseSummary[]> {
  const rows = await db
    .prepare('SELECT * FROM guesthouse_houses WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(userId)
    .all<HouseRow>()
  const houses: HouseRow[] = rows?.results ?? []
  if (!houses.length) return []

  const ids = houses.map((h) => h.id)
  const ph = ids.map(() => '?').join(',')
  const factRows = await db
    .prepare(`SELECT house_id FROM guesthouse_facts WHERE house_id IN (${ph})`)
    .bind(...ids)
    .all<{ house_id: string }>()

  const countByHouse = new Map<string, number>()
  for (const f of factRows?.results ?? []) {
    countByHouse.set(f.house_id, (countByHouse.get(f.house_id) ?? 0) + 1)
  }

  return houses.map((h) => ({
    id: h.id,
    name: h.name,
    shareToken: h.share_token,
    factCount: countByHouse.get(h.id) ?? 0,
    updatedAt: h.updated_at,
  }))
}

/** 宿を案内項目込みで取得。owner 指定なら所有者チェック、token 指定なら公開解決。 */
export async function loadHouse(
  db: any,
  by: { userId?: string; houseId?: string; shareToken?: string }
): Promise<House | null> {
  let row: HouseRow | null = null
  if (by.shareToken) {
    row = await db.prepare('SELECT * FROM guesthouse_houses WHERE share_token = ?').bind(by.shareToken).first<HouseRow>()
  } else if (by.houseId && by.userId) {
    row = await db
      .prepare('SELECT * FROM guesthouse_houses WHERE id = ? AND user_id = ?')
      .bind(by.houseId, by.userId)
      .first<HouseRow>()
  }
  if (!row) return null
  const factRows = await db
    .prepare('SELECT * FROM guesthouse_facts WHERE house_id = ? ORDER BY sort_order ASC')
    .bind(row.id)
    .all<FactRow>()
  return shapeHouse(row, factRows?.results ?? [])
}

/** 宿の案内項目を一括置換する（更新は全消し→入れ直しでシンプルに揃える）。 */
export async function replaceFacts(
  db: any,
  houseId: string,
  facts: { category: string; title: string; body: string }[]
): Promise<void> {
  await db.prepare('DELETE FROM guesthouse_facts WHERE house_id = ?').bind(houseId).run()
  let order = 0
  for (const f of facts) {
    const category = (f?.category ?? '').trim()
    const title = (f?.title ?? '').trim()
    const body = (f?.body ?? '').trim()
    if (!title && !body) continue // 空行はスキップ
    await db
      .prepare('INSERT INTO guesthouse_facts (id, house_id, category, title, body, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(crypto.randomUUID(), houseId, category, title, body, order++)
      .run()
  }
}

/** お客様に見せる「案内できる話題」の見出し（重複を除いたカテゴリ一覧）。 */
export function factCategories(facts: GuestFact[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const f of facts) {
    const c = f.category.trim()
    if (c && !seen.has(c)) {
      seen.add(c)
      out.push(c)
    }
  }
  return out
}

/** Claude へ渡す知識ベース文字列を組み立てる（宿名・コンセプト＋案内項目）。 */
export function buildKnowledgeBase(house: House): string {
  const lines: string[] = []
  lines.push(`【宿名】${house.name || '（未設定）'}`)
  if (house.welcome.trim()) lines.push(`【宿のコンセプト・ウェルカム】\n${house.welcome.trim()}`)
  lines.push('')
  lines.push('【事務案内（この情報だけを根拠に答える）】')
  if (!house.facts.length) {
    lines.push('（登録された案内情報はまだありません）')
  } else {
    for (const f of house.facts) {
      const head = [f.category, f.title].filter((x) => x.trim()).join(' / ')
      lines.push(`■ ${head || '案内'}\n${f.body}`)
    }
  }
  return lines.join('\n')
}
