// life-analyzer（人生の影と光）のサーバー共通処理。
// 認証は既存の WHISPER_DB / users / sessions に相乗りし、記録・分析は user_id でスコープする。
// 本文と分析結果は極めて私的な内容なので encrypt.ts で暗号化して保存する。
import { getSessionUser, getAppDb } from '~/server/utils/auth'
import { encryptComment, decryptComment } from '~/server/utils/encrypt'
import type { LifeAnalysis, LifeCore, LifeDocument, LifeDocumentSummary } from '~/types/life-analyzer'

export interface LifeUser {
  id: string
  username: string
}

/** ログイン必須。未ログインなら 401 を throw。 */
export async function requireLifeUser(event: any): Promise<LifeUser> {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  return user
}

/** DB が無い場合に 503 を throw して返す。 */
export function requireLifeDb(event: any): any {
  const db = getAppDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'DBが利用できません' })
  return db
}

/**
 * life-analyzer 用テーブルを（無ければ）用意する。未マイグレーション環境向けの保険。
 * D1 の `exec` は改行ごとに1文として扱うため複数行のCREATEが通らない。
 * ここでは `prepare().run()` を使う（1文ずつなら改行を含んでよい）。
 */
export async function ensureLifeTables(db: any): Promise<void> {
  const statements = [
    `CREATE TABLE IF NOT EXISTS life_documents (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, title TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '', excerpt TEXT NOT NULL DEFAULT '',
      char_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_life_documents_user ON life_documents(user_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS life_analyses (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, doc_ids TEXT NOT NULL DEFAULT '[]',
      signature TEXT NOT NULL DEFAULT '', result TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_life_analyses_user ON life_analyses(user_id, signature, created_at)`,
    `CREATE TABLE IF NOT EXISTS life_episode_summaries (
      id TEXT PRIMARY KEY, analysis_id TEXT NOT NULL, node_key TEXT NOT NULL,
      result TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // 要約の upsert（ON CONFLICT）が効くように一意インデックスまで作る。
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_life_episode_summaries_node ON life_episode_summaries(analysis_id, node_key)`,
  ]
  // ここで失敗したら後続のクエリも必ず失敗するので握りつぶさず、原因が分かるように投げる。
  for (const sql of statements) await db.prepare(sql).run()
}

// ── テキスト（履歴）──────────────────────────────

interface DocRow {
  id: string
  title: string
  content: string
  excerpt: string
  char_count: number
  created_at: string
}

/** 一覧用の抜粋を作る（改行を潰して先頭だけ）。 */
export function makeExcerpt(text: string, max = 90): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  return flat.length > max ? `${flat.slice(0, max)}…` : flat
}

async function shapeDoc(event: any, row: DocRow, withContent: boolean): Promise<LifeDocumentSummary | LifeDocument> {
  const base: LifeDocumentSummary = {
    id: row.id,
    title: row.title,
    excerpt: await decryptComment(event, row.excerpt),
    charCount: row.char_count,
    createdAt: row.created_at,
  }
  if (!withContent) return base
  return { ...base, content: await decryptComment(event, row.content) }
}

/** 履歴一覧（新しい順・本文なし）。 */
export async function loadDocumentSummaries(event: any, db: any, userId: string): Promise<LifeDocumentSummary[]> {
  const rows = await db
    .prepare(
      `SELECT id, title, '' AS content, excerpt, char_count, created_at
       FROM life_documents WHERE user_id = ? ORDER BY created_at DESC`
    )
    .bind(userId)
    .all<DocRow>()
  const out: LifeDocumentSummary[] = []
  for (const row of rows?.results ?? []) out.push(await shapeDoc(event, row, false) as LifeDocumentSummary)
  return out
}

/** 本文つきで1件取得（所有者チェック込み）。無ければ null。 */
export async function loadDocument(event: any, db: any, userId: string, id: string): Promise<LifeDocument | null> {
  const row = await db
    .prepare('SELECT id, title, content, excerpt, char_count, created_at FROM life_documents WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<DocRow>()
  if (!row) return null
  return await shapeDoc(event, row, true) as LifeDocument
}

/** 指定IDの本文を、渡された順ではなく古い順（人生の時系列に近い）で取得する。 */
export async function loadDocuments(event: any, db: any, userId: string, ids: string[]): Promise<LifeDocument[]> {
  if (!ids.length) return []
  const placeholders = ids.map(() => '?').join(',')
  const rows = await db
    .prepare(
      `SELECT id, title, content, excerpt, char_count, created_at FROM life_documents
       WHERE user_id = ? AND id IN (${placeholders}) ORDER BY created_at ASC`
    )
    .bind(userId, ...ids)
    .all<DocRow>()
  const out: LifeDocument[] = []
  for (const row of rows?.results ?? []) out.push(await shapeDoc(event, row, true) as LifeDocument)
  return out
}

/** テキストを保存する（本文・抜粋は暗号化）。 */
export async function insertDocument(
  event: any,
  db: any,
  userId: string,
  doc: { id: string; title: string; content: string }
): Promise<void> {
  await db
    .prepare('INSERT INTO life_documents (id, user_id, title, content, excerpt, char_count) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(
      doc.id,
      userId,
      doc.title,
      await encryptComment(event, doc.content),
      await encryptComment(event, makeExcerpt(doc.content)),
      doc.content.length
    )
    .run()
}

// ── 分析（キャッシュ）──────────────────────────────

/** テキストIDの集合から、キャッシュキーとなる署名を作る（順序に依らない）。 */
export function analysisSignature(docIds: string[]): string {
  return [...new Set(docIds)].sort().join('|')
}

interface AnalysisRow {
  id: string
  doc_ids: string
  result: string
  created_at: string
}

async function shapeAnalysis(event: any, row: AnalysisRow, titles: Map<string, string>): Promise<LifeAnalysis> {
  const docIds = JSON.parse(row.doc_ids || '[]') as string[]
  const parsed = JSON.parse(await decryptComment(event, row.result) || '{}') as {
    overview?: string
    cores?: LifeCore[]
  }
  return {
    id: row.id,
    docIds,
    docTitles: docIds.map((id) => titles.get(id) ?? '（削除されたテキスト）'),
    overview: parsed.overview ?? '',
    cores: parsed.cores ?? [],
    createdAt: row.created_at,
  }
}

/** 署名が一致する直近の分析を返す。無ければ null。 */
export async function loadCachedAnalysis(
  event: any,
  db: any,
  userId: string,
  signature: string,
  titles: Map<string, string>
): Promise<LifeAnalysis | null> {
  const row = await db
    .prepare(
      `SELECT id, doc_ids, result, created_at FROM life_analyses
       WHERE user_id = ? AND signature = ? ORDER BY created_at DESC LIMIT 1`
    )
    .bind(userId, signature)
    .first<AnalysisRow>()
  if (!row) return null
  const shaped = await shapeAnalysis(event, row, titles)
  return shaped.cores.length ? shaped : null
}

/** 分析結果を保存する（結果JSONは暗号化）。 */
export async function insertAnalysis(
  event: any,
  db: any,
  userId: string,
  analysis: { id: string; docIds: string[]; signature: string; overview: string; cores: LifeCore[] }
): Promise<void> {
  await db
    .prepare('INSERT INTO life_analyses (id, user_id, doc_ids, signature, result) VALUES (?, ?, ?, ?, ?)')
    .bind(
      analysis.id,
      userId,
      JSON.stringify(analysis.docIds),
      analysis.signature,
      await encryptComment(event, JSON.stringify({ overview: analysis.overview, cores: analysis.cores }))
    )
    .run()
}

/** 分析を1件取得（所有者チェック込み）。出来事要約のときに元テキストを引くのに使う。 */
export async function loadAnalysis(
  event: any,
  db: any,
  userId: string,
  id: string,
  titles: Map<string, string>
): Promise<LifeAnalysis | null> {
  const row = await db
    .prepare('SELECT id, doc_ids, result, created_at FROM life_analyses WHERE id = ? AND user_id = ?')
    .bind(id, userId)
    .first<AnalysisRow>()
  return row ? await shapeAnalysis(event, row, titles) : null
}

/** テキストID → タイトルの対応表（分析にタイトルを添えるため）。 */
export async function loadTitleMap(db: any, userId: string): Promise<Map<string, string>> {
  const rows = await db.prepare('SELECT id, title FROM life_documents WHERE user_id = ?').bind(userId).all<{ id: string; title: string }>()
  return new Map((rows?.results ?? []).map((r: { id: string; title: string }) => [r.id, r.title]))
}

// ── 出来事要約のキャッシュ ──────────────────────────────

export async function loadEpisodeSummary<T>(event: any, db: any, analysisId: string, nodeKey: string): Promise<T | null> {
  const row = await db
    .prepare('SELECT result FROM life_episode_summaries WHERE analysis_id = ? AND node_key = ?')
    .bind(analysisId, nodeKey)
    .first<{ result: string }>()
  if (!row) return null
  try {
    return JSON.parse(await decryptComment(event, row.result)) as T
  } catch {
    return null
  }
}

export async function saveEpisodeSummary(event: any, db: any, analysisId: string, nodeKey: string, value: unknown): Promise<void> {
  await db
    .prepare(
      `INSERT INTO life_episode_summaries (id, analysis_id, node_key, result) VALUES (?, ?, ?, ?)
       ON CONFLICT(analysis_id, node_key) DO UPDATE SET result = excluded.result`
    )
    .bind(crypto.randomUUID(), analysisId, nodeKey, await encryptComment(event, JSON.stringify(value)))
    .run()
}

// ── AIに渡すテキストの組み立て ──────────────────────────────

/** 1回の分析でAIに渡す本文の上限（トークン量と応答時間のバランス）。 */
export const ANALYZE_CHAR_LIMIT = 60000

/**
 * 複数テキストを1つの資料にまとめる。上限を超える場合は各テキストから均等に頭を取る
 * （後半だけを捨てると新しい記録が丸ごと落ちるため）。
 */
export function buildSourceText(docs: LifeDocument[], limit = ANALYZE_CHAR_LIMIT): string {
  if (!docs.length) return ''
  const per = Math.floor(limit / docs.length)
  return docs
    .map((d) => {
      const body = d.content.length > per ? `${d.content.slice(0, per)}\n（以下省略）` : d.content
      return `【${d.title}】(${d.createdAt.slice(0, 10)})\n${body}`
    })
    .join('\n\n---\n\n')
}
