/**
 * news の本処理。cron タスク（news-digest）と手動実行API（/api/news/run）の
 * どちらからも同じここを呼ぶ。片方だけ直して挙動がずれる事故を避けるため、
 * 処理は必ずこのファイルに置くこと。
 *
 * 集めて要約して D1 に置くところまでが仕事で、通知はしない（読むのは /news ページ）。
 * 途中で1つのソースや1記事が失敗しても全体は止めず、理由を errors に積んで続ける。
 * 各段階を console.log しているので、失敗時は `wrangler tail` か news_runs で追える。
 *
 * 記事の要約とは別に、今日new_itemsが出た潮流だけ「いまの考察」を書き直す
 * （直近1ヶ月の見出し一覧＋今日の新着を材料にする。新着が無い潮流は据え置き＝
 * 5潮流ぶん毎回呼ぶと費用が無駄になるため）。
 */
import { todayJST } from '~/utils/jst'
import { NEWS_LOOKBACK_DAYS, NEWS_MAX_PER_RUN, NEWS_SOURCES, NEWS_TREND_LOOKBACK_DAYS, sourceName } from '~/utils/news-sources'
import { NEWS_CURRENTS } from '~/utils/news-currents'
import {
  ensureNewsTables,
  fetchArticleText,
  fetchFeed,
  insertItem,
  insertRun,
  loadCurrentContext,
  loadKnownUrls,
  parseFeed,
  upsertCurrentNarrative,
  type FeedEntry,
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

  // 3〜4. 本文を取って要約・潮流分類する
  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  let newItems = 0
  /** 今日の新着を潮流ごとに集める（考察の材料に使う） */
  const newByCurrent = new Map<string, { titleJa: string; summary: string; importance: number }[]>()

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
          current: summary.current,
          bodySource,
          publishedAt: entry.publishedAt,
          digestDate,
        })
        newItems++
        if (!newByCurrent.has(summary.current)) newByCurrent.set(summary.current, [])
        newByCurrent.get(summary.current)!.push({
          titleJa: summary.titleJa,
          summary: summary.summary,
          importance: summary.importance,
        })
        console.log(`[news] 要約: [${summary.importance}] ${summary.titleJa}（${summary.current} / ${bodySource}）`)
      } catch (e: any) {
        // 保存していないので、この記事は次回の実行でもう一度試される
        const msg = `${sourceName(entry.sourceId)}: 要約に失敗（${e?.message ?? e}）`
        console.error(`[news] ${msg} ${entry.url}`)
        errors.push(msg)
      }
    }
  }

  // 5. 今日新着があった潮流だけ「いまの考察」を書き直す（直近1ヶ月の一覧を踏まえる）
  if (apiKey && newByCurrent.size) {
    const since30 = daysBeforeJST(digestDate, NEWS_TREND_LOOKBACK_DAYS)
    for (const [currentId, todayItems] of newByCurrent) {
      const meta = NEWS_CURRENTS.find((c) => c.id === currentId)
      if (!meta) continue // NEWS_FALLBACK_CURRENT 以外はここに来ないはずだが念のため
      try {
        const context = await loadCurrentContext(db, currentId, since30)
        const narrative = await synthesizeCurrentNarrative(apiKey, {
          currentLabel: meta.label,
          currentDescription: meta.description,
          previousNarrative: context.previousNarrative,
          recentItems: context.recentItems,
          todayItems,
        })
        await upsertCurrentNarrative(db, currentId, narrative, context.recentItems.length)
        console.log(`[news] 考察を更新: ${meta.label}（直近30日${context.recentItems.length}件）`)
      } catch (e: any) {
        const msg = `${meta.label}: 考察の更新に失敗（${e?.message ?? e}）`
        console.error(`[news] ${msg}`)
        errors.push(msg)
      }
    }
  }

  await insertRun(db, { digestDate, trigger: opts.trigger, fetched: unique.length, newItems, errors })

  console.log(`[news] done new=${newItems} errors=${errors.length}`)
  return { digestDate, fetched: unique.length, newItems, errors }
}
