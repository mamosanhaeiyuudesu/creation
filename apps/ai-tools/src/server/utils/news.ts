/**
 * news（AIニュース朝刊）のフィード取得・本文抽出・D1 アクセス。
 *
 * Worker と Node（nuxt dev）の両方で動く必要があるので、XML/HTML の解析は
 * DOMParser や HTMLRewriter ではなく正規表現で行う（HTMLRewriter は dev 側に無い）。
 * 「完璧なスクレイピングでなくてよい」前提の割り切り。
 */
import { NEWS_MAX_BODY_CHARS } from '~/utils/news-sources'
import type { NewsBodySource, NewsCurrentState, NewsItem, NewsRun } from '~/types/news'

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
  // Fierce Healthcare が "Sep 4, 2026 9:44am" のように am/pm の前にスペースを
  // 置かない形式を返し、そのままだと Date.parse に失敗するための救済。
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
 *
 * Cloudflare Workers の subrequest 上限（Freeプランは1回の呼び出しにつき50個。
 * fetch() の外部通信だけでなく D1 バインディング経由のアクセスも同じ枠でカウントされる）
 * に当たらないよう、CREATE TABLE/INDEX を db.batch() で1回の呼び出しにまとめて送る
 * （文ごとに .exec() すると news 単体でここだけで7回分を毎回消費していた）。
 * batch() は1文でも失敗すると全体がロールバックされるため、失敗しうる文
 * （列追加のALTERなど）は混ぜない。ここに並ぶのは全部 IF NOT EXISTS で毎回安全に成功する文だけ。
 */
export async function ensureNewsTables(db: any): Promise<void> {
  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS news_items (id TEXT PRIMARY KEY, url TEXT NOT NULL UNIQUE, source_id TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', title_ja TEXT NOT NULL DEFAULT '', summary TEXT NOT NULL DEFAULT '', importance INTEGER NOT NULL DEFAULT 0, reason TEXT NOT NULL DEFAULT '', current TEXT NOT NULL DEFAULT '', body_source TEXT NOT NULL DEFAULT 'feed', published_at TEXT NOT NULL DEFAULT '', digest_date TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS news_currents (id TEXT PRIMARY KEY, narrative TEXT NOT NULL DEFAULT '', item_count_30d INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS news_runs (id TEXT PRIMARY KEY, digest_date TEXT NOT NULL DEFAULT '', trigger TEXT NOT NULL DEFAULT 'cron', fetched INTEGER NOT NULL DEFAULT 0, new_items INTEGER NOT NULL DEFAULT 0, errors TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_news_items_digest ON news_items(digest_date DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_news_items_current ON news_items(current)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_news_runs_created ON news_runs(created_at DESC)`),
    ])
  } catch {
    // 初回以降は全部 IF NOT EXISTS なので基本失敗しないが、念のため黙って続行する
  }
}

/**
 * 渡した URL のうち、すでに処理済みのものを返す。
 * D1 のバインド上限を避けて50件ずつに分けつつ、複数チャンクでも db.batch() で1回の
 * subrequest にまとめる（chunkごとに await すると件数に比例して subrequest を消費するため）。
 */
export async function loadKnownUrls(db: any, urls: string[]): Promise<Set<string>> {
  const known = new Set<string>()
  if (!urls.length) return known

  const chunks: string[][] = []
  for (let i = 0; i < urls.length; i += 50) chunks.push(urls.slice(i, i + 50))

  const statements = chunks.map((chunk) =>
    db.prepare(`SELECT url FROM news_items WHERE url IN (${chunk.map(() => '?').join(',')})`).bind(...chunk)
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
  bodySource: NewsBodySource
  publishedAt: string
  digestDate: string
}

/**
 * 記事をまとめて保存する（1件ずつ insert すると件数ぶん subrequest を消費するため、
 * 呼び出し側で数件ずつバッファしてから渡す想定）。二重起動しても URL の UNIQUE 制約で弾かれる。
 */
export async function insertItems(db: any, items: NewItemInput[]): Promise<void> {
  if (!items.length) return
  await db.batch(
    items.map((item) =>
      db
        .prepare(
          'INSERT OR IGNORE INTO news_items (id, url, source_id, title, title_ja, summary, importance, reason, current, body_source, published_at, digest_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)'
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
    current: r.current ?? '',
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

// ───────────────────────────────── 潮流の考察 ─────────────────────────────────

export interface RecentCurrentItem {
  titleJa: string
  importance: number
  digestDate: string
}

export interface CurrentContext {
  /** 前回書いた考察（無ければ空文字＝初回） */
  previousNarrative: string
  /** 直近 NEWS_TREND_LOOKBACK_DAYS 日ぶんの一覧（見出しと重要度のみ、本文は含まない。今日ぶんも含む） */
  recentItems: RecentCurrentItem[]
  /** 今日ぶんだけ、要約つきで詳しく（考察のプロンプトで「今日の新着」として厚めに渡す） */
  todayItems: { titleJa: string; summary: string; importance: number }[]
}

/**
 * ある潮流の考察を書くための材料（前回の考察＋直近の一覧＋今日ぶんの詳細）をまとめて取得する。
 * 3つ別々に投げると subrequest を3つ消費するため、db.batch() で1回にまとめる。
 */
export async function loadCurrentContext(
  db: any,
  currentId: string,
  sinceDate: string,
  digestDate: string
): Promise<CurrentContext> {
  const [narrativeRes, recentRes, todayRes] = await db.batch([
    db.prepare('SELECT narrative FROM news_currents WHERE id = ?').bind(currentId),
    db
      .prepare(
        'SELECT title_ja, importance, digest_date FROM news_items WHERE current = ? AND digest_date >= ? ORDER BY digest_date DESC LIMIT 200'
      )
      .bind(currentId, sinceDate),
    db
      .prepare('SELECT title_ja, summary, importance FROM news_items WHERE current = ? AND digest_date = ?')
      .bind(currentId, digestDate),
  ])
  return {
    previousNarrative: narrativeRes?.results?.[0]?.narrative ?? '',
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

/** 潮流の考察を書き直す。5潮流ぶん、履歴は持たず1行を上書きする。 */
export async function upsertCurrentNarrative(
  db: any,
  currentId: string,
  narrative: string,
  itemCount30d: number
): Promise<void> {
  await db
    .prepare(
      `INSERT OR REPLACE INTO news_currents (id, narrative, item_count_30d, updated_at) VALUES (?, ?, ?, datetime('now'))`
    )
    .bind(currentId, narrative, itemCount30d)
    .run()
}

/**
 * 今日新着があった潮流のidを返す。trendsタスク（cron/手動とも別の呼び出し＝
 * 別のsubrequest予算で動く）が「どの潮流を更新すべきか」を、collectタスクの
 * メモリ上の状態を引き継がずD1から re-derive するために使う。
 */
export async function listCurrentsWithNewItems(db: any, digestDate: string): Promise<string[]> {
  const res = await db
    .prepare(`SELECT DISTINCT current FROM news_items WHERE digest_date = ? AND current != ''`)
    .bind(digestDate)
    .all<{ current: string }>()
  return (res?.results ?? []).map((r: any) => r.current)
}

export async function listCurrentStates(db: any): Promise<NewsCurrentState[]> {
  const res = await db.prepare('SELECT * FROM news_currents').all<any>()
  return (res?.results ?? []).map((r: any) => ({
    id: r.id,
    narrative: r.narrative ?? '',
    itemCount30d: r.item_count_30d ?? 0,
    updatedAt: r.updated_at ?? '',
  }))
}

