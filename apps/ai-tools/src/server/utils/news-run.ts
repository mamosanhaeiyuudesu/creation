/**
 * news の本処理。cron タスクと手動実行APIの両方からここを呼ぶ。片方だけ直して
 * 挙動がずれる事故を避けるため、処理は必ずこのファイルに置くこと。
 *
 * 2つの独立した処理に分かれている（別々の Cron Trigger・別々のAPIから呼ぶ＝
 * 別々の Worker 呼び出し＝別々の subrequest 予算で動く）:
 *   - runNewsDigest : フィード収集→本文取得→要約・潮流分類→保存
 *   - runNewsTrends : 今日新着があった潮流だけ「いまの考察」を書き直す
 *
 * 分けている理由は Cloudflare Workers の subrequest 上限（Freeプランは1回の呼び出しに
 * つき50個。fetch() の外部通信も D1 バインディング経由のアクセスも同じ枠でカウントされる）。
 * 15フィードの取得＋最大20件の要約＋5潮流ぶんの考察更新を1回の呼び出しに詰め込むと
 * 楽に50を超える（実際に "Too many subrequests" で失敗した）。2つに分けたうえで、
 * runNewsDigest 側は使った subrequest 数を自分で数えて安全マージンに達したら
 * その回の残りは処理せず切り上げる（保存していない記事は次回の実行で自然にもう一度拾われる。
 * 失敗した記事を次回に回すのと同じ仕組みに乗せているだけ）。
 *
 * 途中で1つのソースや1記事が失敗しても全体は止めず、理由を errors に積んで続ける。
 * 各段階を console.log しているので、失敗時は `wrangler tail` か news_runs で追える。
 */
import { todayJST } from '~/utils/jst'
import { NEWS_LOOKBACK_DAYS, NEWS_MAX_PER_RUN, NEWS_SOURCES, NEWS_TREND_LOOKBACK_DAYS, sourceName } from '~/utils/news-sources'
import { NEWS_CURRENTS } from '~/utils/news-currents'
import {
  ensureNewsTables,
  fetchArticleText,
  fetchFeed,
  insertItems,
  insertRun,
  loadCurrentContext,
  loadKnownUrls,
  listCurrentsWithNewItems,
  parseFeed,
  upsertCurrentNarrative,
  type FeedEntry,
  type NewItemInput,
} from '~/server/utils/news'
import { summarizeArticle, synthesizeCurrentNarrative } from '~/server/utils/news-ai'
import type { NewsRunResult } from '~/types/news'

/** cron でも API でも、Cloudflare の env をそのまま渡してもらう。 */
export interface NewsEnv {
  WHISPER_DB?: any
  NUXT_ANTHROPIC_API_KEY?: string
}

/** フィードは新しい順なので、先頭からこの件数だけ見る（日付が無いフィードへの安全弁）。 */
const MAX_ENTRIES_PER_SOURCE = 30

/**
 * Cloudflare Workers の subrequest 上限（Freeプラン50）に対する安全マージン。
 * 50ぴったりまで使う設計にすると見積もりが少しでも外れた瞬間にまた同じエラーになるため、
 * かなり手前で切り上げる。ensureNewsTables(1)＋フィード取得(最大15)＋loadKnownUrls(1)＋
 * 保存バッチ・insertRunの余白(4)を差し引いた残りを記事処理に使う。
 */
const SUBREQUEST_BUDGET = 40

/** insertItems を呼ぶ頻度。1件ずつ保存すると件数ぶん subrequest を消費するため数件貯めてから書く。 */
const INSERT_BATCH_SIZE = 5

function withinLookback(entry: FeedEntry, since: number): boolean {
  if (!entry.publishedAt) return true // 日付が読めないフィードは件数上限だけで守る
  return new Date(entry.publishedAt).getTime() >= since
}

/** YYYY-MM-DD を n日前にずらす（JST の日付文字列としてそのまま引き算してよい）。 */
function daysBeforeJST(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export async function runNewsDigest(
  env: NewsEnv,
  opts: { trigger: 'cron' | 'manual' }
): Promise<NewsRunResult> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const digestDate = todayJST()
  const errors: string[] = []
  console.log(`[news] start trigger=${opts.trigger} date=${digestDate}`)

  let used = 0 // ここまでに消費した subrequest 数の見積もり
  const spend = (n = 1) => {
    used += n
  }

  await ensureNewsTables(db)
  spend() // ensureNewsTables は db.batch() でまとめてあるので1回ぶん

  // 1. 各フィードを取得。1ソースが落ちても他は続ける。
  const since = Date.now() - NEWS_LOOKBACK_DAYS * 24 * 3600 * 1000
  const sources = NEWS_SOURCES.filter((s) => s.enabled)
  const candidates: FeedEntry[] = []

  for (const source of sources) {
    spend() // fetchFeed
    try {
      const xml = await fetchFeed(source.url)
      const entries = parseFeed(xml, source.id).slice(0, MAX_ENTRIES_PER_SOURCE)
      const fresh = entries.filter((e) => withinLookback(e, since))
      console.log(`[news] feed ${source.id}: ${entries.length}件中 ${fresh.length}件が対象期間`)
      candidates.push(...fresh)
    } catch (e: any) {
      const msg = `${source.name}: フィード取得に失敗（${e?.message ?? e}）`
      console.error(`[news] ${msg}`)
      errors.push(msg)
    }
  }

  // 2. 既知のURLを除いて新着だけにする（これが「処理済み一覧」との差分）
  const byUrl = new Map<string, FeedEntry>()
  for (const e of candidates) if (!byUrl.has(e.url)) byUrl.set(e.url, e)
  const unique = [...byUrl.values()].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))

  const known = unique.length ? await loadKnownUrls(db, unique.map((e) => e.url)) : new Set<string>()
  spend() // loadKnownUrls はチャンク数に関わらず db.batch() で1回ぶん
  const fresh = unique.filter((e) => !known.has(e.url)).slice(0, NEWS_MAX_PER_RUN)
  console.log(`[news] 対象${unique.length}件 / 既処理${known.size}件 / 今回候補${fresh.length}件（subrequest使用済み${used}）`)

  // 3〜4. 本文を取って要約・潮流分類する。予算が尽きたら残りは処理せず次回の実行に回す
  // （保存していない記事は loadKnownUrls に引っかからないので、失敗した記事と同じ仕組みで自然に再試行される）。
  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  let newItems = 0
  let attempted = 0 // 成否に関わらずループを回した件数（打ち切り時の「残り件数」の計算に使う）
  const pending: NewItemInput[] = []
  const source = new Map(sources.map((s) => [s.id, s]))

  async function flushPending() {
    if (!pending.length) return
    await insertItems(db, pending.splice(0, pending.length))
    spend()
  }

  if (fresh.length && !apiKey) {
    const msg = 'NUXT_ANTHROPIC_API_KEY が未設定のため要約できません'
    console.error(`[news] ${msg}`)
    errors.push(msg)
  }

  if (apiKey) {
    for (const entry of fresh) {
      // このまま処理すると予算オーバーになりそうなら、ここで打ち切る（最大2＝本文取得+要約ぶんを見込む）
      if (used + 2 > SUBREQUEST_BUDGET) {
        console.log(`[news] subrequest予算(${SUBREQUEST_BUDGET})に近づいたため残り${fresh.length - attempted}件は次回に回す`)
        break
      }
      attempted++

      try {
        let body = ''
        let bodySource: 'article' | 'feed' = 'feed'

        // フィードの要約が薄いときだけ記事本文を取りに行く。
        // skipArticleFetch のソース（OpenAIなど常に403になると確認済み）は最初から試さない。
        if (entry.description.length < 600 && !source.get(entry.sourceId)?.skipArticleFetch) {
          spend()
          try {
            const article = await fetchArticleText(entry.url)
            if (article.length > entry.description.length) {
              body = article
              bodySource = 'article'
            }
          } catch (e: any) {
            console.log(`[news] 本文取得を諦めてフィードの要約を使う: ${entry.url}（${e?.message ?? e}）`)
          }
        }
        if (!body) body = entry.description

        if (!body.trim()) {
          errors.push(`${sourceName(entry.sourceId)}: 本文も要約も空（${entry.url}）`)
          continue
        }

        spend() // summarizeArticle（Claude呼び出し）
        const summary = await summarizeArticle(apiKey, {
          title: entry.title,
          url: entry.url,
          sourceName: sourceName(entry.sourceId),
          body,
          bodyIsFeedSummary: bodySource === 'feed',
        })

        pending.push({
          url: entry.url,
          sourceId: entry.sourceId,
          title: entry.title,
          titleJa: summary.titleJa,
          summary: summary.summary,
          importance: summary.importance,
          reason: summary.reason,
          current: summary.current,
          bodySource,
          publishedAt: entry.publishedAt,
          digestDate,
        })
        newItems++
        if (pending.length >= INSERT_BATCH_SIZE) await flushPending()
        console.log(`[news] 要約: [${summary.importance}] ${summary.titleJa}（${summary.current} / ${bodySource}）`)
      } catch (e: any) {
        // 保存していないので、この記事は次回の実行でもう一度試される
        const msg = `${sourceName(entry.sourceId)}: 要約に失敗（${e?.message ?? e}）`
        console.error(`[news] ${msg} ${entry.url}`)
        errors.push(msg)
      }
    }
    await flushPending()
  }

  // apiKey が無い場合は「未設定」のエラーを既に積んでいるので、ここでは二重に出さない
  const deferred = apiKey ? fresh.length - attempted : 0
  if (deferred > 0) errors.push(`subrequest予算のため${deferred}件は次回の実行に持ち越し`)

  await insertRun(db, { digestDate, trigger: opts.trigger, fetched: unique.length, newItems, errors })

  console.log(`[news] done new=${newItems} deferred=${deferred} errors=${errors.length} subrequest使用済み≈${used}`)
  return { digestDate, fetched: unique.length, newItems, errors }
}

/**
 * 今日新着があった潮流だけ「いまの考察」を書き直す。runNewsDigest とは別の呼び出しで動く
 * （cronは別トリガー、手動実行はページから別のAPIを呼ぶ）ので、対象の潮流は
 * runNewsDigest のメモリ上の状態を引き継がず D1 から re-derive する。
 */
export async function runNewsTrends(env: NewsEnv): Promise<{ updated: string[]; errors: string[] }> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  const errors: string[] = []
  if (!apiKey) return { updated: [], errors: ['NUXT_ANTHROPIC_API_KEY が未設定のため考察を更新できません'] }

  const digestDate = todayJST()
  const currentIds = await listCurrentsWithNewItems(db, digestDate)
  console.log(`[news] trends: 本日新着があった潮流 = ${currentIds.join(', ') || '(なし)'}`)

  const since30 = daysBeforeJST(digestDate, NEWS_TREND_LOOKBACK_DAYS)
  const updated: string[] = []

  for (const currentId of currentIds) {
    const meta = NEWS_CURRENTS.find((c) => c.id === currentId)
    if (!meta) continue // NEWS_FALLBACK_CURRENT 以外はここに来ないはずだが念のため
    try {
      const context = await loadCurrentContext(db, currentId, since30, digestDate)
      const narrative = await synthesizeCurrentNarrative(apiKey, {
        currentLabel: meta.label,
        currentDescription: meta.description,
        previousNarrative: context.previousNarrative,
        recentItems: context.recentItems,
        todayItems: context.todayItems,
      })
      await upsertCurrentNarrative(db, currentId, narrative, context.recentItems.length)
      updated.push(currentId)
      console.log(`[news] 考察を更新: ${meta.label}（直近30日${context.recentItems.length}件）`)
    } catch (e: any) {
      const msg = `${meta.label}: 考察の更新に失敗（${e?.message ?? e}）`
      console.error(`[news] ${msg}`)
      errors.push(msg)
    }
  }

  return { updated, errors }
}
