/**
 * farm-news（農業×AI専門ニュース）のフィード取得・本文抽出・D1 アクセス。
 *
 * フィード解析・本文抽出部分は news.ts と同じロジック（汎用的なRSS/Atom解析で
 * farm-news固有の要素は無い）。DRYより「ツールごとに独立して壊れる範囲を閉じる」という
 * このリポジトリの既存方針（news/kaki/momo等がそれぞれ専用ファイルを持つ）に倣い複製している。
 * 挙動を変えるときは news.ts 側も直す必要がないか確認すること。
 *
 * Worker と Node（nuxt dev）の両方で動く必要があるので、XML/HTML の解析は
 * DOMParser や HTMLRewriter ではなく正規表現で行う。
 */
import { FARM_NEWS_MAX_BODY_CHARS } from '~/utils/farm-news-sources'
import type { FarmNewsBodySource, FarmNewsCurrentSection, FarmNewsCurrentState, FarmNewsItem, FarmNewsRun, FarmNewsTrendSnapshot } from '~/types/farm-news'

// ───────────────────────────────── フィード解析 ─────────────────────────────────

export interface FeedEntry {
  sourceId: string
  title: string
  url: string
  description: string
  /** ISO 文字列。パースできなければ空 */
  publishedAt: string
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&') // 最後にやる（&amp;lt; の二重デコードを避ける）
}

function stripTags(s: string): string {
  return s.replace(/<[^>]*>/g, ' ')
}

function clean(s: string): string {
  return decodeEntities(stripTags(s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')))
    .replace(/\s+/g, ' ')
    .trim()
}

function pickTag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')
  return clean(block.match(re)?.[1] ?? '')
}

function pickAtomLink(block: string): string {
  for (const m of block.matchAll(/<link\b([^>]*)\/?>/gi)) {
    const attrs = m[1] ?? ''
    const rel = attrs.match(/\brel\s*=\s*["']([^"']+)["']/i)?.[1]
    if (rel && rel !== 'alternate') continue
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1]
    if (href) return decodeEntities(href)
  }
  return ''
}

function toIso(raw: string): string {
  if (!raw) return ''
  const normalized = raw.replace(/(\d)(am|pm)$/i, '$1 $2')
  const t = new Date(normalized).getTime()
  return Number.isNaN(t) ? '' : new Date(t).toISOString()
}

/** RSS 2.0（<item>）と Atom（<entry>）の両方を同じ形に均す。 */
export function parseFeed(xml: string, sourceId: string): FeedEntry[] {
  const entries: FeedEntry[] = []
  for (const m of xml.matchAll(/<(item|entry)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
    const block = m[2] ?? ''
    const url = pickTag(block, 'link') || pickAtomLink(block)
    if (!url) continue
    entries.push({
      sourceId,
      title: pickTag(block, 'title'),
      url: url.trim(),
      description:
        pickTag(block, 'content:encoded') ||
        pickTag(block, 'description') ||
        pickTag(block, 'summary') ||
        pickTag(block, 'content'),
      publishedAt: toIso(
        pickTag(block, 'pubDate') || pickTag(block, 'published') || pickTag(block, 'updated') || pickTag(block, 'dc:date')
      ),
    })
  }
  return entries
}

const UA = 'ai-tools-farm-news-digest/1.0 (public agri-ai digest)'

export async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

// ───────────────────────────────── 記事本文 ─────────────────────────────────

export async function fetchArticleText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml' },
    signal: AbortSignal.timeout(20000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')

  const scope =
    body.match(/<article(?:\s[^>]*)?>([\s\S]*?)<\/article>/i)?.[1] ??
    body.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i)?.[1] ??
    body

  const parts: string[] = []
  for (const m of scope.matchAll(/<(p|h1|h2|h3|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
    const text = clean(m[2] ?? '')
    const min = (m[1] ?? '').toLowerCase().startsWith('h') ? 8 : 40
    if (text.length >= min) parts.push(text)
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, FARM_NEWS_MAX_BODY_CHARS).trim()
}

// ───────────────────────────────── 管理用API認証 ─────────────────────────────────

/**
 * 公開ページなので通常の users/sessions ログインは使わない（news.ts の getSessionUser とは別）。
 * 「いま収集する」に相当する手動実行は、秘密キーをヘッダーで渡してコマンドから叩く運用にする
 * （NUXT_FARM_NEWS_ADMIN_KEY。.env / wrangler secret put で設定）。
 */
export function requireFarmNewsAdmin(event: any): void {
  const key = event.context?.cloudflare?.env?.NUXT_FARM_NEWS_ADMIN_KEY
  const provided = getHeader(event, 'x-admin-key')
  if (!key || !provided || provided !== key) {
    throw createError({ statusCode: 401, message: '管理キーが一致しません（x-admin-key ヘッダーを確認してください）' })
  }
}

// ───────────────────────────────── D1 ─────────────────────────────────

/**
 * farm-news 用テーブルを（無ければ）用意する。062_farm_news.sql を流し忘れた環境向けの保険。
 * news.ts の ensureNewsTables と同じ理由で db.batch() に1回でまとめる（改行区切りの
 * CREATE TABLE文を複数行でexec()すると静かに失敗する罠があるため、1文ずつprepareする）。
 */
export async function ensureFarmNewsTables(db: any): Promise<void> {
  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS farm_news_items (id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', title_ja TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', importance INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', current TEXT NOT NULL DEFAULT '', body_source TEXT NOT NULL DEFAULT 'feed', published_at TEXT NOT NULL DEFAULT '', digest_date TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS farm_news_currents (id TEXT PRIMARY KEY, narrative TEXT NOT NULL DEFAULT '', item_count_30d INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS farm_news_trend_snapshots (id TEXT PRIMARY KEY, period_type TEXT NOT NULL DEFAULT 'month', period_key TEXT NOT NULL DEFAULT '', narrative TEXT NOT NULL DEFAULT '', item_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS farm_news_runs (id TEXT PRIMARY KEY, digest_date TEXT NOT NULL DEFAULT '', trigger TEXT NOT NULL DEFAULT 'cron', fetched INTEGER NOT NULL DEFAULT 0, new_items INTEGER NOT NULL DEFAULT 0, errors TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_farm_news_items_digest ON farm_news_items(digest_date DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_farm_news_items_current ON farm_news_items(current)`),
      db.prepare(`CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_news_snapshots_period ON farm_news_trend_snapshots(period_type, period_key)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_farm_news_runs_created ON farm_news_runs(created_at DESC)`),
    ])
  } catch {
    // 初回以降は全部 IF NOT EXISTS なので基本失敗しないが、念のため黙って続行する
  }
}

export async function loadKnownUrls(db: any, urls: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  if (!urls.length) return known

  const chunks: string[][] = []
  for (let i = 0; i < urls.length; i += 50) chunks.push(urls.slice(i, i + 50))

  const statements = chunks.map((chunk) =>
    db.prepare(`SELECT url FROM farm_news_items WHERE url IN (${chunk.map(() => '?').join(',')})`).bind(...chunk)
  )
  const results = await db.batch(statements)
  for (const res of results ?? []) {
    for (const row of res?.results ?? []) known.add(row.url)
  }
  return known
}

export interface NewItemInput {
  url: string
  sourceId: string
  title: string
  titleJa: string
  summary: string
  importance: number
  reason: string
  current: string
  bodySource: FarmNewsBodySource
  publishedAt: string
  digestDate: string
}

export async function insertItems(db: any, items: NewItemInput[]): Promise<void> {
  if (!items.length) return
  await db.batch(
    items.map((item) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO farm_news_items (id, url, source_id, title, title_ja, summary, importance, reason, current, body_source, published_at, digest_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
        )
        .bind(
          crypto.randomUUID(),
          item.url,
          item.sourceId,
          item.title,
          item.titleJa,
          item.summary,
          item.importance,
          item.reason,
          item.current,
          item.bodySource,
          item.publishedAt,
          item.digestDate
        )
    )
  )
}

function toFarmNewsItem(r: any): FarmNewsItem {
  return {
    id: r.id,
    url: r.url,
    sourceId: r.source_id ?? '',
    title: r.title ?? '',
    titleJa: r.title_ja ?? '',
    summary: r.summary ?? '',
    importance: r.importance ?? 0,
    reason: r.reason ?? '',
    current: r.current ?? '',
    bodySource: (r.body_source === 'article' ? 'article' : 'feed') as FarmNewsBodySource,
    publishedAt: r.published_at ?? '',
    digestDate: r.digest_date ?? '',
    createdAt: r.created_at ?? '',
  }
}

export async function listItems(db: any, limit = 200): Promise<FarmNewsItem[]> {
  const res = await db
    .prepare('SELECT * FROM farm_news_items ORDER BY digest_date DESC, published_at DESC, created_at DESC LIMIT ?')
    .bind(limit)
    .all<any>()
  return (res?.results ?? []).map(toFarmNewsItem)
}

export async function listRuns(db: any, limit = 20): Promise<FarmNewsRun[]> {
  const res = await db.prepare('SELECT * FROM farm_news_runs ORDER BY created_at DESC LIMIT ?').bind(limit).all<any>()
  return (res?.results ?? []).map((r: any) => ({
    id: r.id,
    digestDate: r.digest_date ?? '',
    trigger: r.trigger === 'manual' ? 'manual' : 'cron',
    fetched: r.fetched ?? 0,
    newItems: r.new_items ?? 0,
    errors: r.errors ?? '',
    createdAt: r.created_at ?? '',
  }))
}

export async function insertRun(
  db: any,
  run: { digestDate: string; trigger: string; fetched: number; newItems: number; errors: string[] }
): Promise<void> {
  await db
    .prepare('INSERT INTO farm_news_runs (id, digest_date, trigger, fetched, new_items, errors) VALUES (?,?,?,?,?,?)')
    .bind(crypto.randomUUID(), run.digestDate, run.trigger, run.fetched, run.newItems, run.errors.join('\n'))
    .run()
}

// ───────────────────────────────── 潮流の考察（いま・これから） ─────────────────────────────────

export interface RecentCurrentItem {
  titleJa: string
  importance: number
  digestDate: string
}

export interface CurrentContext {
  previousSections: FarmNewsCurrentSection[]
  recentItems: RecentCurrentItem[]
  todayItems: { titleJa: string; summary: string; importance: number }[]
}

interface StoredNarrative {
  sections: FarmNewsCurrentSection[]
  bullets: string[]
}

/** news.ts の parseSections と同じ寛容パース（旧形式が来ても壊れない保険）。 */
function parseSections(raw: string | null | undefined): StoredNarrative {
  if (!raw) return { sections: [], bullets: [] }
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.every((s) => typeof s?.title === 'string' && typeof s?.body === 'string')) {
      return { sections: parsed, bullets: [] }
    }
    if (parsed && typeof parsed === 'object' && Array.isArray(parsed.sections)) {
      return {
        sections: parsed.sections,
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.filter((b: unknown) => typeof b === 'string') : [],
      }
    }
  } catch {
    // フォールバックへ
  }
  return raw.trim() ? { sections: [{ title: '', body: raw }], bullets: [] } : { sections: [], bullets: [] }
}

export async function loadCurrentContext(
  db: any,
  currentId: string,
  sinceDate: string,
  digestDate: string
): Promise<CurrentContext> {
  const [narrativeRes, recentRes, todayRes] = await db.batch([
    db.prepare('SELECT narrative FROM farm_news_currents WHERE id = ?').bind(currentId),
    db
      .prepare(
        'SELECT title_ja, importance, digest_date FROM farm_news_items WHERE current = ? AND digest_date >= ? ORDER BY digest_date DESC LIMIT 200'
      )
      .bind(currentId, sinceDate),
    db
      .prepare('SELECT title_ja, summary, importance FROM farm_news_items WHERE current = ? AND digest_date = ?')
      .bind(currentId, digestDate),
  ])
  return {
    previousSections: parseSections(narrativeRes?.results?.[0]?.narrative).sections,
    recentItems: (recentRes?.results ?? []).map((r: any) => ({
      titleJa: r.title_ja ?? '',
      importance: r.importance ?? 0,
      digestDate: r.digest_date ?? '',
    })),
    todayItems: (todayRes?.results ?? []).map((r: any) => ({
      titleJa: r.title_ja ?? '',
      summary: r.summary ?? '',
      importance: r.importance ?? 0,
    })),
  }
}

export async function upsertCurrentNarrative(
  db: any,
  currentId: string,
  sections: FarmNewsCurrentSection[],
  bullets: string[],
  itemCount30d: number
): Promise<void> {
  await db
    .prepare(`INSERT OR REPLACE INTO farm_news_currents (id, narrative, item_count_30d, updated_at) VALUES (?, ?, ?, datetime('now'))`)
    .bind(currentId, JSON.stringify({ sections, bullets }), itemCount30d)
    .run()
}

export async function listCurrentsWithNewItems(db: any, digestDate: string): Promise<string[]> {
  const res = await db
    .prepare(`SELECT DISTINCT current FROM farm_news_items WHERE digest_date = ? AND current != ''`)
    .bind(digestDate)
    .all<{ current: string }>()
  return (res?.results ?? []).map((r: any) => r.current)
}

export async function listCurrentStates(db: any): Promise<FarmNewsCurrentState[]> {
  const res = await db.prepare('SELECT * FROM farm_news_currents').all<any>()
  return (res?.results ?? []).map((r: any) => {
    const { sections, bullets } = parseSections(r.narrative)
    return { id: r.id, sections, bullets, itemCount30d: r.item_count_30d ?? 0, updatedAt: r.updated_at ?? '' }
  })
}

// ───────────────────────────────── 潮流アーカイブ（月次・年次スナップショット） ─────────────────────────────────

function toSnapshot(r: any): FarmNewsTrendSnapshot {
  let sections: FarmNewsCurrentSection[] = []
  try {
    const parsed = JSON.parse(r.narrative || '[]')
    if (Array.isArray(parsed)) sections = parsed
  } catch {
    // 壊れていれば空のまま
  }
  return {
    id: r.id,
    periodType: r.period_type === 'year' ? 'year' : 'month',
    periodKey: r.period_key ?? '',
    sections,
    itemCount: r.item_count ?? 0,
    createdAt: r.created_at ?? '',
  }
}

export async function listSnapshots(db: any): Promise<FarmNewsTrendSnapshot[]> {
  const res = await db.prepare('SELECT * FROM farm_news_trend_snapshots ORDER BY period_key DESC').all<any>()
  return (res?.results ?? []).map(toSnapshot)
}

/** 既に生成済みの period_key 一覧（period_type ごと）。バックフィル時に「まだ無い月/年」を求めるのに使う。 */
export async function listSnapshotPeriodKeys(db: any, periodType: 'month' | 'year'): Promise<Set<string>> {
  const res = await db.prepare('SELECT period_key FROM farm_news_trend_snapshots WHERE period_type = ?').bind(periodType).all<any>()
  return new Set((res?.results ?? []).map((r: any) => r.period_key))
}

/** 記事が実際に存在する月（YYYY-MM）の一覧。歯抜けでよい＝活動があった月だけアーカイブすればよいため。 */
export async function listMonthsWithItems(db: any): Promise<string[]> {
  const res = await db
    .prepare(`SELECT DISTINCT substr(digest_date, 1, 7) AS month FROM farm_news_items WHERE digest_date != '' ORDER BY month ASC`)
    .all<any>()
  return (res?.results ?? []).map((r: any) => r.month).filter(Boolean)
}

/** ある月（YYYY-MM）の記事一覧（見出し・潮流・重要度のみ、月次考察の材料）。 */
export async function loadMonthItems(
  db: any,
  monthKey: string
): Promise<{ titleJa: string; current: string; importance: number }[]> {
  const res = await db
    .prepare(`SELECT title_ja, current, importance FROM farm_news_items WHERE digest_date LIKE ? ORDER BY digest_date ASC`)
    .bind(`${monthKey}-%`)
    .all<any>()
  return (res?.results ?? []).map((r: any) => ({ titleJa: r.title_ja ?? '', current: r.current ?? '', importance: r.importance ?? 0 }))
}

/** ある年に属する月次スナップショット（年次考察の材料）。 */
export async function loadMonthSnapshotsForYear(db: any, year: string): Promise<FarmNewsTrendSnapshot[]> {
  const res = await db
    .prepare(`SELECT * FROM farm_news_trend_snapshots WHERE period_type = 'month' AND period_key LIKE ? ORDER BY period_key ASC`)
    .bind(`${year}-%`)
    .all<any>()
  return (res?.results ?? []).map(toSnapshot)
}

/**
 * スナップショットを保存する。INSERT OR IGNORE＝一度生成した期間は不変（アーカイブとして固定する設計）。
 * 作り直したいときは明示的に DELETE してから再実行する。
 */
export async function insertSnapshot(
  db: any,
  input: { periodType: 'month' | 'year'; periodKey: string; sections: FarmNewsCurrentSection[]; itemCount: number }
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO farm_news_trend_snapshots (id, period_type, period_key, narrative, item_count) VALUES (?,?,?,?,?)')
    .bind(crypto.randomUUID(), input.periodType, input.periodKey, JSON.stringify(input.sections), input.itemCount)
    .run()
}
