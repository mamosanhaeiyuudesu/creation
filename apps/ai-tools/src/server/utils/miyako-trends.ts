/**
 * miyako「直近の傾向」の部品（一覧ページの解析・本文の整形・D1・OpenAI Vector Store）。
 * 処理の順番と、なぜこう分けているかは miyako-trends-run.ts の冒頭コメント参照。
 */
import type {
  MiyakoSessionKind,
  MiyakoSessionStatus,
  MiyakoTrendState,
  MiyakoTrendTerm,
} from '~/types/miyako-trends'
import staticFileIds from '../data/miyako-file-ids.json'

/** 市の「会議録PDFファイル」ページ。会期ごとに1本のPDFが並んでいる。 */
export const MIYAKO_MINUTES_LIST_URL = 'https://www.city.miyakojima.lg.jp/gyosei/gikai/gijiroku.html'

/**
 * 一覧から拾う会期の下限。最初の前処理パイプラインで Vector Store に入れた会期
 * （src/server/data/miyako-file-ids.json。令和7年第9回＝2025年12月まで）は、同じ会期名なら
 * そのファイルを使い回す（insertFoundSessionStatements）。ただし令和7年の第1〜3回は
 * その前処理で漏れていて Vector Store にも features にも無いので、2025年から拾って入れ直す。
 * これより古い会期まで拾うと、会期名の表記ゆれ（元年など）ひとつで同じ会期を二重に
 * アップロードしかねないので広げないこと。
 */
export const MIYAKO_INGEST_FROM = '2025-01-01'

/**
 * バズ語を計算する定例会の下限。これより前の定例会は比較対象として本文を持つだけで、
 * 分析はしない（AI代がかかるだけで画面にも出ないため。見たければ手動実行の reanalyze で個別に）。
 */
export const MIYAKO_ANALYZE_FROM = '2026-01-01'

/** 本文を D1 に保存するときの1行あたりの文字数（D1のSQL1文100KB上限に収まる大きさ）。 */
export const MIYAKO_TEXT_CHUNK_CHARS = 25_000

/** バズ度の比較に使う過去の期間（年）。 */
export const MIYAKO_BASELINE_YEARS = 3

/** ワードクラウドに出す語数。 */
export const MIYAKO_TREND_TOP = 40

export interface ListedSession {
  key: string
  label: string
  kind: MiyakoSessionKind
  heldFrom: string
  heldTo: string
  pdfUrl: string
}

export interface SessionRow {
  session_key: string
  label: string
  kind: MiyakoSessionKind
  held_from: string
  held_to: string
  pdf_url: string
  file_id: string
  chars: number
  status: MiyakoSessionStatus
  error: string
  base_sessions: number
  prev_session_key: string
  analyzed_at: string
}

// ───────────────────────────── 一覧ページ ─────────────────────────────

const pad2 = (n: number | string) => String(n).padStart(2, '0')

/**
 * 一覧ページのHTMLから会期を取り出す。ファイル名には規則が無い（R8.2.pdf / R806kaigiroku.pdf /
 * 712teireikai.pdf …）ので、リンク文字列「令和８年第４回宮古島市議会（定例会）会議録【R８．６．１１ー６．２９】」
 * から会期名と日付を読む。全角数字・全角ピリオドは NFKC で半角にそろえてから照合する。
 */
export function parseMinutesList(html: string): ListedSession[] {
  const sessions: ListedSession[] = []
  const linkRe = /<a\s[^>]*href="([^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi
  let m: RegExpExecArray | null
  while ((m = linkRe.exec(html))) {
    const [, href = '', inner = ''] = m
    const text = inner.replace(/<[^>]+>/g, '').normalize('NFKC').replace(/\s+/g, '')
    const s = text.match(
      /(令和|平成)(元|\d+)年第(\d+)回宮古島市議会\((定例会|臨時会)\)会議録【([RH])(\d+)\.(\d+)\.(\d+)(?:[^\d】]+(?:(\d+)\.)?(\d+)\.(\d+))?】/
    )
    if (!s) continue
    // endYear は「R8.1.23ー8.1.25」のように終わりにも年が付いていた場合だけ入る（使わない）
    const [, era, yearText, no, kind, dateEra, y, mo = '', d = '', , endMo, endD] = s
    const year = (dateEra === 'R' ? 2018 : 1988) + Number(y)
    const heldFrom = `${year}-${pad2(mo)}-${pad2(d)}`
    let heldTo = heldFrom
    if (endMo && endD) {
      // 【R７．１２．３ー１２．１７】のように終わりは「月.日」。年をまたぐ会期は無いはずだが念のため
      heldTo = `${Number(endMo) < Number(mo) ? year + 1 : year}-${pad2(endMo)}-${pad2(endD)}`
    }
    sessions.push({
      key: `${era}${yearText}年第${no}回${kind}`,
      label: `${era}${yearText}年 第${no}回 ${kind}`,
      kind: kind as MiyakoSessionKind,
      heldFrom,
      heldTo,
      pdfUrl: new URL(href, MIYAKO_MINUTES_LIST_URL).toString(),
    })
  }
  return sessions
}

// ───────────────────────────── 本文 ─────────────────────────────

/**
 * Vector Store から取り出した本文を、語を数えられる形にそろえる。
 * PDF由来の本文は1行ごとに改行（\r\n）が入り、語が行の途中で折り返されると数え漏れる
 * （実測: 下地島 27→28回）。日本語は空白を詰めても意味が変わらないので、空白・改行をすべて取り除く。
 * scripts/miyako-trends-backfill.mjs にも同じ処理があるので、変えるときは両方そろえること。
 */
export function normalizeMinutesText(raw: string): string {
  return raw
    .replace(/<PARSED TEXT FOR PAGE: \d+ \/ \d+>/g, '') // PDFのページ区切り
    .replace(/^====[^\n]*====/, '') // 最初の前処理パイプラインが .txt の先頭に付けた見出し行
    .replace(/\s+/g, '')
}

export function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = []
  for (let i = 0; i < text.length; i += size) chunks.push(text.slice(i, i + size))
  return chunks
}

/** YYYY-MM-DD を n年前にずらす。 */
export function yearsBefore(ymd: string, years: number): string {
  return `${Number(ymd.slice(0, 4)) - years}${ymd.slice(4)}`
}

// ───────────────────────────── 管理キー ─────────────────────────────

/** 手動実行APIを x-admin-key ヘッダーで守る（公開ページなのでログインではなくキーで守る）。 */
export function requireMiyakoAdmin(event: any): void {
  const key = event.context?.cloudflare?.env?.NUXT_MIYAKO_ADMIN_KEY
  const provided = getHeader(event, 'x-admin-key')
  if (!key || !provided || provided !== key) {
    throw createError({ statusCode: 401, message: '管理キーが一致しません（x-admin-key ヘッダーを確認してください）' })
  }
}

// ───────────────────────────── D1 ─────────────────────────────

/**
 * テーブルを（無ければ）用意する。068_miyako_trends.sql を流し忘れた環境向けの保険。
 * news.ts と同じ理由で1文ずつ prepare して db.batch() にまとめる
 * （複数行の CREATE TABLE を exec() すると静かに失敗する罠があるため）。
 */
export async function ensureMiyakoTrendTables(db: any): Promise<void> {
  try {
    await db.batch([
      db.prepare(
        `CREATE TABLE IF NOT EXISTS miyako_sessions (session_key TEXT PRIMARY KEY, label TEXT NOT NULL DEFAULT '', kind TEXT NOT NULL DEFAULT '', held_from TEXT NOT NULL DEFAULT '', held_to TEXT NOT NULL DEFAULT '', pdf_url TEXT NOT NULL DEFAULT '', file_id TEXT NOT NULL DEFAULT '', chars INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'found', error TEXT NOT NULL DEFAULT '', base_sessions INTEGER NOT NULL DEFAULT 0, prev_session_key TEXT NOT NULL DEFAULT '', analyzed_at TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS miyako_texts (session_key TEXT NOT NULL, seq INTEGER NOT NULL, body TEXT NOT NULL, PRIMARY KEY (session_key, seq))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS miyako_trend_terms (session_key TEXT NOT NULL, term TEXT NOT NULL, rank INTEGER NOT NULL DEFAULT 0, count INTEGER NOT NULL DEFAULT 0, rate REAL NOT NULL DEFAULT 0, base_rate REAL NOT NULL DEFAULT 0, prev_count INTEGER NOT NULL DEFAULT 0, buzz REAL NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', PRIMARY KEY (session_key, term))`
      ),
      db.prepare(
        `CREATE TABLE IF NOT EXISTS miyako_trend_runs (id TEXT PRIMARY KEY, trigger TEXT NOT NULL DEFAULT 'cron', summary TEXT NOT NULL DEFAULT '', errors TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL DEFAULT (datetime('now')))`
      ),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_miyako_sessions_held ON miyako_sessions(held_from DESC)`),
      db.prepare(`CREATE INDEX IF NOT EXISTS idx_miyako_trend_runs_created ON miyako_trend_runs(created_at DESC)`),
    ])
  } catch {
    // 初回以降は全部 IF NOT EXISTS なので基本失敗しないが、念のため黙って続行する
  }
}

export async function listSessionRows(db: any): Promise<SessionRow[]> {
  const res = await db.prepare('SELECT * FROM miyako_sessions ORDER BY held_from ASC').all()
  return (res?.results ?? []) as SessionRow[]
}

/**
 * 一覧で見つけた会期を登録する。既にある会期は触らない（状態を巻き戻さない）。
 * 最初の前処理で Vector Store に入れ済みの会期は、そのファイルを使って indexed から始める。
 */
export function insertFoundSessionStatements(db: any, sessions: ListedSession[]): any[] {
  return sessions.map((s) => {
    const fileId = (staticFileIds as Record<string, string>)[s.key] ?? ''
    return db
      .prepare(
        'INSERT OR IGNORE INTO miyako_sessions (session_key, label, kind, held_from, held_to, pdf_url, file_id, status) VALUES (?,?,?,?,?,?,?,?)'
      )
      .bind(s.key, s.label, s.kind, s.heldFrom, s.heldTo, s.pdfUrl, fileId, fileId ? 'indexed' : 'found')
  })
}

export function updateSessionStatement(
  db: any,
  key: string,
  fields: Partial<Pick<SessionRow, 'file_id' | 'chars' | 'status' | 'error' | 'base_sessions' | 'prev_session_key' | 'analyzed_at'>>
): any {
  const cols = Object.keys(fields)
  const sets = cols.map((c) => `${c} = ?`).join(', ')
  return db
    .prepare(`UPDATE miyako_sessions SET ${sets}, updated_at = datetime('now') WHERE session_key = ?`)
    .bind(...cols.map((c) => (fields as any)[c]), key)
}

/** 本文を保存する文（入れ直しに備えて先に消す）。status の更新と同じ batch に入れて1回で書く。 */
export function storeTextStatements(db: any, key: string, text: string): any[] {
  return [
    db.prepare('DELETE FROM miyako_texts WHERE session_key = ?').bind(key),
    ...splitIntoChunks(text, MIYAKO_TEXT_CHUNK_CHARS).map((body, seq) =>
      db.prepare('INSERT INTO miyako_texts (session_key, seq, body) VALUES (?,?,?)').bind(key, seq, body)
    ),
  ]
}

export async function loadSessionText(db: any, key: string): Promise<string> {
  const res = await db.prepare('SELECT body FROM miyako_texts WHERE session_key = ? ORDER BY seq').bind(key).all()
  return ((res?.results ?? []) as { body: string }[]).map((r) => r.body).join('')
}

/**
 * 語の出現回数を会期ごとに数える（SQLite の replace() で消した分の長さ÷語の長さ）。
 * 数えるのは D1 側なので Worker の CPU 時間を使わない。1つのクエリに全会期を詰めると
 * 手元の SQLite で13会期×60語が3.6秒かかったため、会期ごとに1クエリに分けて batch で送る
 * （D1 の1クエリ30秒上限から十分離すため。batch なので subrequest は1回ぶん）。
 * 語は D1 のバインド上限（1クエリ100個）から会期キーの1個を引いた99個まで。
 */
export async function countTermsBySession(
  db: any,
  terms: string[],
  sessionKeys: string[]
): Promise<Map<string, Map<string, number>>> {
  const out = new Map<string, Map<string, number>>()
  if (!terms.length || !sessionKeys.length) return out
  if (terms.length > 99) throw new Error(`語が多すぎます（${terms.length}個。99個まで）`)

  const values = terms.map(() => '(?)').join(',')
  const sql = `WITH terms(term) AS (VALUES ${values}) SELECT t.term AS term, SUM((length(c.body) - length(replace(c.body, t.term, ''))) / length(t.term)) AS n FROM terms t CROSS JOIN miyako_texts c WHERE c.session_key = ? GROUP BY t.term`
  const results = await db.batch(sessionKeys.map((k) => db.prepare(sql).bind(...terms, k)))
  sessionKeys.forEach((k, i) => {
    const counts = new Map<string, number>()
    for (const row of results?.[i]?.results ?? []) counts.set(row.term, Number(row.n) || 0)
    out.set(k, counts)
  })
  return out
}

export function saveTrendTermStatements(db: any, key: string, terms: MiyakoTrendTerm[]): any[] {
  return [
    db.prepare('DELETE FROM miyako_trend_terms WHERE session_key = ?').bind(key),
    ...terms.map((t) =>
      db
        .prepare(
          'INSERT INTO miyako_trend_terms (session_key, term, rank, count, rate, base_rate, prev_count, buzz, note) VALUES (?,?,?,?,?,?,?,?,?)'
        )
        .bind(key, t.term, t.rank, t.count, t.rate, t.baseRate, t.prevCount, t.buzz, t.note)
    ),
  ]
}

export async function insertTrendRun(
  db: any,
  run: { trigger: string; summary: string; errors: string[] }
): Promise<void> {
  await db
    .prepare('INSERT INTO miyako_trend_runs (id, trigger, summary, errors) VALUES (?,?,?,?)')
    .bind(crypto.randomUUID(), run.trigger, run.summary, run.errors.join('\n'))
    .run()
}

/** ページ表示用。key を省くと最新の分析済み定例会を返す。 */
export async function loadTrendState(db: any, key?: string): Promise<MiyakoTrendState> {
  const res = await db
    .prepare(
      "SELECT session_key, label, held_from, held_to, analyzed_at, base_sessions, prev_session_key FROM miyako_sessions WHERE status = 'analyzed' ORDER BY held_from DESC"
    )
    .all()
  const rows = (res?.results ?? []) as SessionRow[]
  const sessions = rows.map((r) => ({ key: r.session_key, label: r.label, heldFrom: r.held_from, heldTo: r.held_to }))

  const row = rows.find((r) => r.session_key === key) ?? rows[0]
  if (!row) return { sessions, current: null }

  const [termRes, prevRow] = await db.batch([
    db.prepare('SELECT * FROM miyako_trend_terms WHERE session_key = ? ORDER BY rank').bind(row.session_key),
    db.prepare('SELECT label FROM miyako_sessions WHERE session_key = ?').bind(row.prev_session_key),
  ])
  const terms: MiyakoTrendTerm[] = (termRes?.results ?? []).map((t: any) => ({
    term: t.term,
    rank: t.rank,
    count: t.count,
    rate: t.rate,
    baseRate: t.base_rate,
    prevCount: t.prev_count,
    buzz: t.buzz,
    note: t.note,
  }))

  return {
    sessions,
    current: {
      key: row.session_key,
      label: row.label,
      heldFrom: row.held_from,
      heldTo: row.held_to,
      analyzedAt: row.analyzed_at,
      baseSessions: row.base_sessions,
      prevLabel: prevRow?.results?.[0]?.label ?? '',
      terms,
    },
  }
}

// ───────────────────────────── OpenAI（Vector Store） ─────────────────────────────

async function openAiJson(apiKey: string, path: string, init: RequestInit = {}): Promise<any> {
  const res = await fetch(`https://api.openai.com/v1${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${apiKey}`, ...(init.headers ?? {}) },
  })
  const data: any = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`OpenAI ${path}: ${res.status} ${data?.error?.message ?? ''}`.trim())
  return data
}

/**
 * Vector Store に同じ会期が既に入っていれば file id を返す（二重アップロード防止）。
 * 一覧は新しく登録した順に返るので、直近に入れたものは1ページ目（100件）に必ず載る。
 * ローカルの wrangler dev と本番で D1 が別々でも、ここで重複を防げる。
 */
export async function findSessionInVectorStore(apiKey: string, vsId: string, key: string): Promise<string | null> {
  const data = await openAiJson(apiKey, `/vector_stores/${vsId}/files?limit=100&order=desc`)
  const hit = (data?.data ?? []).find((f: any) => f?.attributes?.session === key && f?.status !== 'failed')
  return hit?.id ?? null
}

/** PDF を取得して OpenAI にアップロードし、会期名を attributes に付けて Vector Store に登録する。 */
export async function uploadPdfToVectorStore(
  apiKey: string,
  vsId: string,
  session: { key: string; pdfUrl: string }
): Promise<string> {
  const pdfRes = await fetch(session.pdfUrl)
  if (!pdfRes.ok) throw new Error(`PDFの取得に失敗（${pdfRes.status} ${session.pdfUrl}）`)
  const pdf = await pdfRes.arrayBuffer()

  const form = new FormData()
  form.append('purpose', 'assistants')
  form.append('file', new Blob([pdf], { type: 'application/pdf' }), `${session.key}.pdf`)
  const file = await openAiJson(apiKey, '/files', { method: 'POST', body: form })

  await openAiJson(apiKey, `/vector_stores/${vsId}/files`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ file_id: file.id, attributes: { session: session.key } }),
  })
  return file.id as string
}

export async function getVectorStoreFileStatus(apiKey: string, vsId: string, fileId: string): Promise<string> {
  const data = await openAiJson(apiKey, `/vector_stores/${vsId}/files/${fileId}`)
  if (data?.status === 'failed') throw new Error(`Vector Store の解析に失敗（${data?.last_error?.message ?? '理由不明'}）`)
  return data?.status ?? 'unknown'
}

/**
 * Vector Store が解析した本文を取り出す（PDFの文字化を OpenAI 側に任せるため。Worker で PDF を
 * 読むと CPU 上限に当たる）。実測では373ページのPDFでも1ページ分（has_more=false）で全文が返った。
 * 続きがある場合のページ送りの仕様は確認できていないので、黙って途中までで済ませずに止める。
 */
export async function fetchVectorStoreFileText(apiKey: string, vsId: string, fileId: string): Promise<string> {
  const data = await openAiJson(apiKey, `/vector_stores/${vsId}/files/${fileId}/content`)
  if (data?.has_more) throw new Error('本文が複数ページに分かれて返ってきました（ページ送りは未対応）')
  return ((data?.data ?? []) as { text?: string }[]).map((p) => p.text ?? '').join('\n')
}
