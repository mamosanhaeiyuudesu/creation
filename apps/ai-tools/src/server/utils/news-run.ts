/**
 * news の本処理。cron タスク（news-digest）と手動実行API（/api/news/run）の
 * どちらからも同じここを呼ぶ。片方だけ直して挙動がずれる事故を避けるため、
 * 処理は必ずこのファイルに置くこと。
 *
 * 集めて要約して D1 に置くところまでが仕事で、通知はしない（読むのは /news ページ）。
 * 途中で1つのソースや1記事が失敗しても全体は止めず、理由を errors に積んで続ける。
 * 各段階を console.log しているので、失敗時は `wrangler tail` か news_runs で追える。
 */
import { todayJST } from '~/utils/jst'
import { NEWS_LOOKBACK_DAYS, NEWS_MAX_PER_RUN, NEWS_SOURCES, sourceName } from '~/utils/news-sources'
import {
  ensureNewsTables,
  fetchArticleText,
  fetchFeed,
  insertItem,
  insertRun,
  loadKnownUrls,
  parseFeed,
  type FeedEntry,
} from '~/server/utils/news'
import { summarizeArticle } from '~/server/utils/news-ai'
import type { NewsRunResult } from '~/types/news'

/** cron でも API でも、Cloudflare の env をそのまま渡してもらう。 */
export interface NewsEnv {
  WHISPER_DB?: any
  NUXT_ANTHROPIC_API_KEY?: string
}

/** フィードは新しい順なので、先頭からこの件数だけ見る（日付が無いフィードへの安全弁）。 */
const MAX_ENTRIES_PER_SOURCE = 30

function withinLookback(entry: FeedEntry, since: number): boolean {
  if (!entry.publishedAt) return true // 日付が読めないフィードは件数上限だけで守る
  return new Date(entry.publishedAt).getTime() >= since
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

  await ensureNewsTables(db)

  // 1. 各フィードを取得。1ソースが落ちても他は続ける。
  const since = Date.now() - NEWS_LOOKBACK_DAYS * 24 * 3600 * 1000
  const sources = NEWS_SOURCES.filter((s) => s.enabled)
  const candidates: FeedEntry[] = []

  for (const source of sources) {
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
  const fresh = unique.filter((e) => !known.has(e.url)).slice(0, NEWS_MAX_PER_RUN)
  console.log(`[news] 対象${unique.length}件 / 既処理${known.size}件 / 今回処理${fresh.length}件`)

  // 3〜4. 本文を取って要約する
  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  let newItems = 0

  if (fresh.length && !apiKey) {
    const msg = 'NUXT_ANTHROPIC_API_KEY が未設定のため要約できません'
    console.error(`[news] ${msg}`)
    errors.push(msg)
  }

  if (apiKey) {
    for (const entry of fresh) {
      try {
        let body = ''
        let bodySource: 'article' | 'feed' = 'feed'

        // フィードの要約が薄いときだけ記事本文を取りに行く。
        // OpenAI は記事ページが 403 を返すので、ここは失敗する前提で書いてある。
        if (entry.description.length < 600) {
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

        const summary = await summarizeArticle(apiKey, {
          title: entry.title,
          url: entry.url,
          sourceName: sourceName(entry.sourceId),
          body,
          bodyIsFeedSummary: bodySource === 'feed',
        })

        await insertItem(db, {
          url: entry.url,
          sourceId: entry.sourceId,
          title: entry.title,
          titleJa: summary.titleJa,
          summary: summary.summary,
          importance: summary.importance,
          reason: summary.reason,
          bodySource,
          publishedAt: entry.publishedAt,
          digestDate,
        })
        newItems++
        console.log(`[news] 要約: [${summary.importance}] ${summary.titleJa}（${bodySource}）`)
      } catch (e: any) {
        // 保存していないので、この記事は次回の実行でもう一度試される
        const msg = `${sourceName(entry.sourceId)}: 要約に失敗（${e?.message ?? e}）`
        console.error(`[news] ${msg} ${entry.url}`)
        errors.push(msg)
      }
    }
  }

  await insertRun(db, { digestDate, trigger: opts.trigger, fetched: unique.length, newItems, errors })

  console.log(`[news] done new=${newItems} errors=${errors.length}`)
  return { digestDate, fetched: unique.length, newItems, errors }
}
