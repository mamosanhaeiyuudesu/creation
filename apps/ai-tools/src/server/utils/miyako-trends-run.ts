/**
 * miyako「直近の傾向」の本処理。cron タスク（毎月1日）と手動実行APIの両方からここを呼ぶ。
 * 片方だけ直して挙動がずれる事故を避けるため、処理は必ずこのファイルに置くこと。
 *
 * 会期ごとに状態（miyako_sessions.status）を進める:
 *   found    → 市の一覧ページで新しい会期を見つけた
 *   indexed  → PDF を OpenAI の Vector Store に登録（AI解説の検索対象になる。臨時会はここで完了）
 *   stored   → Vector Store が文字化した本文を取り出し、空白を詰めて D1 に保存（定例会のみ）
 *   analyzed → AI が候補語を出し、D1 で今回と過去3年の定例会の出現回数を数え、バズ度の上位40語を保存
 * 1段階ずつ D1 に書いてから次へ進むので、途中で落ちても次回はその続きからやり直せる。
 *
 * 役割の分け方は Cloudflare Workers の Free プランの制約から来ている:
 *   - CPU 時間は1回10ms。PDF を読むのも形態素解析（43万字で約96ms）も Worker では無理なので、
 *     文字化は OpenAI の Vector Store、語の切り出しは AI、回数を数えるのは D1 の SQL に任せる。
 *     Worker がやるのは受け渡しだけ（本文の JSON 解析 約1ms ＋ 空白の除去）。
 *   - subrequest は1回50個（外部 fetch も D1 も同じ枠）。使った数を数え、足りなくなりそうなら
 *     次の段階に進まず次回に回す（news-run.ts と同じ考え方）。
 *
 * 古い会期から順に処理する。先に本文を入れた会期が、後の会期の「過去3年」の比較対象になるため。
 * 公開は閉会から2〜3か月後なので、月1回の cron で見つかる新しい会期は多くても定例会1つと臨時会1つ。
 * 初回（令和8年の4会期が未取り込み）や失敗後のやり直しは手動実行API（/api/miyako/trends/run）で進める。
 */
import {
  MIYAKO_ANALYZE_FROM,
  MIYAKO_BASELINE_YEARS,
  MIYAKO_INGEST_FROM,
  MIYAKO_MINUTES_LIST_URL,
  MIYAKO_TREND_TOP,
  countTermsBySession,
  ensureMiyakoTrendTables,
  fetchVectorStoreFileText,
  findSessionInVectorStore,
  getVectorStoreFileStatus,
  insertFoundSessionStatements,
  insertTrendRun,
  listSessionRows,
  loadSessionText,
  normalizeMinutesText,
  parseMinutesList,
  saveTrendTermStatements,
  storeTextStatements,
  updateSessionStatement,
  uploadPdfToVectorStore,
  yearsBefore,
  type ListedSession,
  type SessionRow,
} from '~/server/utils/miyako-trends'
import { extractTermCandidates, type TermCandidate } from '~/server/utils/miyako-trends-ai'
import type { MiyakoTrendRunResult, MiyakoTrendTerm } from '~/types/miyako-trends'

/** cron でも API でも、Cloudflare の env をそのまま渡してもらう。 */
export interface MiyakoTrendEnv {
  WHISPER_DB?: any
  NUXT_OPENAI_API_KEY?: string
  NUXT_MIYAKO_VECTOR_STORE_ID?: string
}

/** subrequest の上限（Free プラン50）に対し、この数を超えそうなら次の段階に進まない。 */
const SUBREQUEST_BUDGET = 48

/** 各段階で使う subrequest の最大見込み。 */
const COST_INDEX = 5 // Vector Store 一覧1 + PDF取得1 + アップロード1 + 登録1 + D1 1
const MAX_POLLS = 12 // 5秒おき＝最長1分待つ（373ページのPDFで実測18秒）
const POLL_INTERVAL_MS = 5_000
const COST_STORE = MAX_POLLS + 2 // 解析待ち + 本文取得1 + D1 1
const COST_ANALYZE = 14 // 本文読込1 + AI 4分割（429の再試行込みで最大10）+ 集計1 + 保存1 + 余白1

/** バズ語として残す下限。今回の出現回数と、過去との比（(今回+1)/(過去+1)）。 */
const MIN_COUNT = 5
const MIN_LIFT = 1.25

/** 語の候補数の上限（D1 のバインド上限から、会期キーの1個を引いた数）。 */
const MAX_CANDIDATES = 99

/**
 * 1回の呼び出しで本文（40〜70万字）を扱う会期の数。本文の JSON 解析と空白の除去で
 * 手元でも数msかかり、Free プランの CPU 上限（10ms）では1会期がやっと。
 * 同じ会期の保存と分析は本文を使い回すので1つと数える。
 */
const MAX_TEXTS_PER_RUN = 1

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

class BudgetExceeded extends Error {}

export async function runMiyakoTrends(
  env: MiyakoTrendEnv,
  opts: { trigger: 'cron' | 'manual'; reanalyze?: string }
): Promise<MiyakoTrendRunResult> {
  const db = env.WHISPER_DB
  const apiKey = env.NUXT_OPENAI_API_KEY
  const vsId = env.NUXT_MIYAKO_VECTOR_STORE_ID
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')
  if (!apiKey) throw new Error('NUXT_OPENAI_API_KEY が設定されていません')
  if (!vsId?.startsWith('vs_')) throw new Error('NUXT_MIYAKO_VECTOR_STORE_ID が Vector Store のID（vs_...）ではありません')

  const errors: string[] = []
  const progressed: string[] = []
  let used = 0
  const spend = (n = 1) => {
    used += n
    // 上限の50を超えると Cloudflare が例外にするが、どこで止まったか分かるよう手前で自分から止める
    if (used > SUBREQUEST_BUDGET + 1) throw new BudgetExceeded(`subrequest の予算を使い切りました（${used}）`)
  }
  const canSpend = (n: number) => used + n <= SUBREQUEST_BUDGET
  let texts = 0 // この回で本文を扱った会期の数
  console.log(`[miyako-trends] start trigger=${opts.trigger}${opts.reanalyze ? ` reanalyze=${opts.reanalyze}` : ''}`)

  await ensureMiyakoTrendTables(db)
  spend()

  // 1. 一覧ページから新しい会期を見つけて登録する（一覧が読めなくても、途中の会期の続きはやる）
  let listed: ListedSession[] = []
  try {
    spend()
    const res = await fetch(MIYAKO_MINUTES_LIST_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    listed = parseMinutesList(await res.text()).filter((s) => s.heldFrom >= MIYAKO_INGEST_FROM)
    console.log(`[miyako-trends] 一覧: 取り込み対象 ${listed.length}会期`)
  } catch (e: any) {
    errors.push(`会議録一覧の取得に失敗（${e?.message ?? e}）`)
  }

  if (listed.length) {
    await db.batch(insertFoundSessionStatements(db, listed))
    spend()
  }

  const rows = await listSessionRows(db)
  spend()

  // 2. 古い順に、終わっていない会期の状態を1段階ずつ進める。
  // reanalyze（AIへの指示を変えたとき用）で指定した会期は、分析済みでも本文から分析し直す。
  // status は分析が成功するまで analyzed のまま＝失敗してもページには前回の結果が出続ける。
  let reanalyzed = false // reanalyze の会期をこの回で分析し終えたか（終えたら残りに数えない）
  const wantsAnalysis = (row: SessionRow) =>
    row.session_key === opts.reanalyze && !reanalyzed
      ? row.status === 'stored' || row.status === 'analyzed'
      : row.status === 'stored' && row.held_from >= MIYAKO_ANALYZE_FROM
  const isDone = (row: SessionRow) =>
    row.kind === '臨時会'
      ? row.status !== 'found'
      : row.status !== 'found' && row.status !== 'indexed' && !wantsAnalysis(row)

  for (const row of rows) {
    if (isDone(row)) continue
    const key = row.session_key
    try {
      let text: string | null = null

      if (row.status === 'found') {
        if (!canSpend(COST_INDEX)) break
        await indexSession(db, apiKey, vsId, row, spend)
        progressed.push(`${key}: indexed`)
        if (row.kind === '臨時会') continue
      }
      if (row.status === 'indexed') {
        if (texts >= MAX_TEXTS_PER_RUN || !canSpend(COST_STORE)) continue
        texts++
        text = await storeSession(db, apiKey, vsId, row, spend)
        progressed.push(`${key}: stored（${text.length.toLocaleString()}字）`)
        if (isDone(row)) continue
      }
      if (wantsAnalysis(row)) {
        if ((text === null && texts >= MAX_TEXTS_PER_RUN) || !canSpend(COST_ANALYZE)) continue
        if (text === null) texts++
        const n = await analyzeSession(db, apiKey, row, rows, text, spend)
        if (key === opts.reanalyze) reanalyzed = true
        progressed.push(`${key}: analyzed（${n}語）`)
      }
    } catch (e: any) {
      const msg = `${key}: ${e?.message ?? e}`
      console.error(`[miyako-trends] ${msg}`)
      errors.push(msg)
      if (e instanceof BudgetExceeded) break
      try {
        spend()
        await updateSessionStatement(db, key, { error: String(e?.message ?? e).slice(0, 500) }).run()
      } catch {
        break
      }
    }
  }

  const deferred = rows.filter((r) => !isDone(r)).map((r) => `${r.session_key}: ${r.status}`)
  const result: MiyakoTrendRunResult = { listed: listed.length, progressed, deferred, errors }
  const summary = `一覧${listed.length}会期 / 進んだ: ${progressed.join('、') || 'なし'} / 次回へ: ${deferred.join('、') || 'なし'} / subrequest ${used}`
  console.log(`[miyako-trends] ${summary}`)
  try {
    await insertTrendRun(db, { trigger: opts.trigger, summary, errors })
  } catch {
    // ログが書けなくても結果は返す
  }
  return result
}

async function indexSession(db: any, apiKey: string, vsId: string, row: SessionRow, spend: (n?: number) => void) {
  spend()
  let fileId = await findSessionInVectorStore(apiKey, vsId, row.session_key)
  if (!fileId) {
    spend(3)
    fileId = await uploadPdfToVectorStore(apiKey, vsId, { key: row.session_key, pdfUrl: row.pdf_url })
  }
  spend()
  await updateSessionStatement(db, row.session_key, { status: 'indexed', file_id: fileId, error: '' }).run()
  row.status = 'indexed'
  row.file_id = fileId
}

async function storeSession(
  db: any,
  apiKey: string,
  vsId: string,
  row: SessionRow,
  spend: (n?: number) => void
): Promise<string> {
  for (let i = 0; ; i++) {
    spend()
    if ((await getVectorStoreFileStatus(apiKey, vsId, row.file_id)) === 'completed') break
    if (i >= MAX_POLLS - 1) throw new Error('Vector Store の解析が終わりません（次回に続きから再開します）')
    await sleep(POLL_INTERVAL_MS)
  }

  spend()
  const text = normalizeMinutesText(await fetchVectorStoreFileText(apiKey, vsId, row.file_id))
  if (text.length < 10_000) throw new Error(`本文が短すぎます（${text.length}字）。文字化に失敗している可能性があります`)

  spend()
  await db.batch([
    ...storeTextStatements(db, row.session_key, text),
    updateSessionStatement(db, row.session_key, { status: 'stored', chars: text.length, error: '' }),
  ])
  row.status = 'stored'
  row.chars = text.length
  return text
}

async function analyzeSession(
  db: any,
  apiKey: string,
  row: SessionRow,
  rows: SessionRow[],
  text: string | null,
  spend: (n?: number) => void
): Promise<number> {
  if (text === null) spend()
  const body = text ?? (await loadSessionText(db, row.session_key))
  if (!body) throw new Error('本文が保存されていません')

  const candidates = await extractTermCandidates(apiKey, body, { maxTerms: MAX_CANDIDATES, spend: () => spend() })
  if (!candidates.length) throw new Error('候補語が1つも出ませんでした')

  // 比較対象: この会期より前の3年間に始まった、本文を保存済みの定例会
  const from = yearsBefore(row.held_from, MIYAKO_BASELINE_YEARS)
  const base = rows.filter(
    (r) =>
      r.kind === '定例会' &&
      r.session_key !== row.session_key &&
      (r.status === 'stored' || r.status === 'analyzed') &&
      r.chars > 0 &&
      r.held_from >= from &&
      r.held_from < row.held_from
  )
  const prev = base[base.length - 1] ?? null // rows は held_from の古い順

  spend()
  const counts = await countTermsBySession(
    db,
    candidates.map((c) => c.term),
    [row.session_key, ...base.map((b) => b.session_key)]
  )
  const terms = scoreTerms(candidates, counts, row, base, prev?.session_key ?? null)
  console.log(`[miyako-trends] ${row.session_key}: 候補${candidates.length}語 → バズ語${terms.length}語（比較${base.length}会期）`)

  spend()
  await db.batch([
    ...saveTrendTermStatements(db, row.session_key, terms),
    updateSessionStatement(db, row.session_key, {
      status: 'analyzed',
      error: '',
      base_sessions: base.length,
      prev_session_key: prev?.session_key ?? '',
      analyzed_at: new Date().toISOString(),
    }),
  ])
  row.status = 'analyzed'
  return terms.length
}

/**
 * バズ度 = 今回の頻度 × log2((今回の頻度+1) / (過去3年の頻度+1))。頻度は10万字あたり。
 * 「今よく出る」×「いつもより多い」。毎回よく出る語（学校・予算・職員など）は過去の頻度も高いので沈み、
 * 新しく出てきた話題は過去の頻度がほぼ0なので浮く。比較対象が無い（最初の会期）ときは頻度だけで並ぶ。
 */
export function scoreTerms(
  candidates: TermCandidate[],
  counts: Map<string, Map<string, number>>,
  target: Pick<SessionRow, 'session_key' | 'chars'>,
  base: Pick<SessionRow, 'session_key' | 'chars'>[],
  prevKey: string | null
): MiyakoTrendTerm[] {
  const baseChars = base.reduce((s, b) => s + b.chars, 0)
  const round2 = (n: number) => Math.round(n * 100) / 100

  const scored = candidates
    .map((c) => {
      const count = counts.get(target.session_key)?.get(c.term) ?? 0
      const baseCount = base.reduce((s, b) => s + (counts.get(b.session_key)?.get(c.term) ?? 0), 0)
      const rate = (count / target.chars) * 100_000
      const baseRate = baseChars ? (baseCount / baseChars) * 100_000 : 0
      const lift = (rate + 1) / (baseRate + 1)
      return {
        term: c.term,
        note: c.note,
        count,
        rate,
        baseRate,
        prevCount: prevKey ? counts.get(prevKey)?.get(c.term) ?? 0 : 0,
        buzz: rate * Math.log2(lift),
        lift,
      }
    })
    // 出現0回＝AIが本文に無い語を作った。いつも通りの語（lift が小さい）もここで落とす
    .filter((t) => t.count >= MIN_COUNT && t.lift >= MIN_LIFT)

  // 入れ子の語（下地島 と 下地島空港）は片方だけ残す。短い方がほぼ長い方の一部としてしか
  // 出てこないなら長い方を、短い方が単独でもよく出るなら短い方を残す。
  const removed = new Set<string>()
  for (const a of scored) {
    for (const b of scored) {
      if (a === b || removed.has(a.term) || removed.has(b.term) || !b.term.includes(a.term)) continue
      removed.add(a.count <= b.count * 1.5 ? a.term : b.term)
    }
  }

  return scored
    .filter((t) => !removed.has(t.term))
    .sort((a, b) => b.buzz - a.buzz)
    .slice(0, MIYAKO_TREND_TOP)
    .map((t, i) => ({
      term: t.term,
      rank: i + 1,
      count: t.count,
      rate: round2(t.rate),
      baseRate: round2(t.baseRate),
      prevCount: t.prevCount,
      buzz: round2(t.buzz),
      note: t.note,
    }))
}
