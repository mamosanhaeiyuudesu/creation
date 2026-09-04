/**
 * news（AIニュース朝刊）のフィード取得・本文抽出・D1 アクセス。
 *
 * Worker と Node（nuxt dev）の両方で動く必要があるので、XML/HTML の解析は
 * DOMParser や HTMLRewriter ではなく正規表現で行う（HTMLRewriter は dev 側に無い）。
 * 「完璧なスクレイピングでなくてよい」前提の割り切り。
 */
import { NEWS_MAX_BODY_CHARS } from '~/utils/news-sources'
import type { NewsBodySource, NewsItem, NewsRun } from '~/types/news'

// ───────────────────────────────── フィード解析 ─────────────────────────────────

export interface FeedEntry {
  sourceId: string
  title: string
  url: string
  /** フィード側の要約（空のこともある。DeepMind は常に空） */
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

/** ブロックから最初に見つかったタグの中身を返す。<description/> のような空要素は '' になる。 */
function pickTag(block: string, name: string): string {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')
  return clean(block.match(re)?.[1] ?? '')
}

/** Atom の <link href="..."/>（rel が alternate か未指定のもの）を拾う。 */
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
  const t = new Date(raw).getTime()
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

const UA = 'ai-tools-news-digest/1.0 (personal daily digest)'

export async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(20000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return await res.text()
}

// ───────────────────────────────── 記事本文 ─────────────────────────────────

/**
 * 記事ページから本文らしいテキストを抜く。取れなければ空文字（呼び出し側が
 * フィードの description にフォールバックする）。
 *
 * 実測: DeepMind は取れる（<p> が30個ほど）。OpenAI は UA を変えても 403 を返すので
 * 常に空になり、feed 側の description（平均156字）で要約することになる。
 */
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

  // <article> / <main> があればその中だけを見る（サイドバーやおすすめ記事を巻き込まない）
  const scope =
    body.match(/<article(?:\s[^>]*)?>([\s\S]*?)<\/article>/i)?.[1] ??
    body.match(/<main(?:\s[^>]*)?>([\s\S]*?)<\/main>/i)?.[1] ??
    body

  const parts: string[] = []
  for (const m of scope.matchAll(/<(p|h1|h2|h3|li)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/gi)) {
    const text = clean(m[2] ?? '')
    // ナビゲーションのリンク文言などを落とすため、短すぎる <p>/<li> は捨てる
    const min = (m[1] ?? '').toLowerCase().startsWith('h') ? 8 : 40
    if (text.length >= min) parts.push(text)
  }

  return parts.join('\n').replace(/\n{3,}/g, '\n\n').slice(0, NEWS_MAX_BODY_CHARS).trim()
}

// ───────────────────────────────── D1 ─────────────────────────────────

/**
 * news 用テーブルを（無ければ）用意する。052_news.sql を流し忘れた環境向けの保険。
 * D1 の exec() は改行を文区切りとして扱うため、各文は1行で書く。
 */
export async function ensureNewsTables(db: any): Promise<void> {
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS news_items (id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', title_ja TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', importance INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', body_source TEXT NOT NULL DEFAULT 'feed', published_at TEXT NOT NULL DEFAULT '', digest_date TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db
    .exec(
      `CREATE TABLE IF NOT EXISTS news_runs (id TEXT PRIMARY KEY, digest_date TEXT NOT NULL DEFAULT '', trigger TEXT NOT NULL DEFAULT 'cron', fetched INTEGER NOT NULL DEFAULT 0, new_items INTEGER NOT NULL DEFAULT 0, errors TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
    )
    .catch(() => {})
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_news_items_digest ON news_items(digest_date DESC)`).catch(() => {})
  await db.exec(`CREATE INDEX IF NOT EXISTS idx_news_runs_created ON news_runs(created_at DESC)`).catch(() => {})
}

/** 渡した URL のうち、すでに処理済みのものを返す。D1 のバインド上限を避けて50件ずつ問い合わせる。 */
export async function loadKnownUrls(db: any, urls: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  for (let i = 0; i < urls.length; i += 50) {
    const chunk = urls.slice(i, i + 50)
    if (!chunk.length) continue
    const placeholders = chunk.map(() => '?').join(',')
    const res = await db
      .prepare(`SELECT url FROM news_items WHERE url IN (${placeholders})`)
      .bind(...chunk)
      .all<{ url: string }>()
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
  bodySource: NewsBodySource
  publishedAt: string
  digestDate: string
}

/** 記事を1件保存して id を返す。二重起動しても URL の UNIQUE 制約で弾かれる。 */
export async function insertItem(db: any, item: NewItemInput): Promise<string> {
  const id = crypto.randomUUID()
  await db
    .prepare(
      'INSERT OR IGNORE INTO news_items (id, url, source_id, title, title_ja, summary, importance, reason, body_source, published_at, digest_date) VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    )
    .bind(
      id,
      item.url,
      item.sourceId,
      item.title,
      item.titleJa,
      item.summary,
      item.importance,
      item.reason,
      item.bodySource,
      item.publishedAt,
      item.digestDate
    )
    .run()
  const row = await db.prepare('SELECT id FROM news_items WHERE url = ?').bind(item.url).first<{ id: string }>()
  return row?.id ?? id
}

function toNewsItem(r: any): NewsItem {
  return {
    id: r.id,
    url: r.url,
    sourceId: r.source_id ?? '',
    title: r.title ?? '',
    titleJa: r.title_ja ?? '',
    summary: r.summary ?? '',
    importance: r.importance ?? 0,
    reason: r.reason ?? '',
    bodySource: (r.body_source === 'article' ? 'article' : 'feed') as NewsBodySource,
    publishedAt: r.published_at ?? '',
    digestDate: r.digest_date ?? '',
    createdAt: r.created_at ?? '',
  }
}

export async function listItems(db: any, limit = 200): Promise<NewsItem[]> {
  const res = await db
    .prepare('SELECT * FROM news_items ORDER BY digest_date DESC, published_at DESC, created_at DESC LIMIT ?')
    .bind(limit)
    .all<any>()
  return (res?.results ?? []).map(toNewsItem)
}

export async function listRuns(db: any, limit = 20): Promise<NewsRun[]> {
  const res = await db.prepare('SELECT * FROM news_runs ORDER BY created_at DESC LIMIT ?').bind(limit).all<any>()
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
    .prepare(
      'INSERT INTO news_runs (id, digest_date, trigger, fetched, new_items, errors) VALUES (?,?,?,?,?,?)'
    )
    .bind(
      crypto.randomUUID(),
      run.digestDate,
      run.trigger,
      run.fetched,
      run.newItems,
      run.errors.join('\n')
    )
    .run()
}

