/**
 * farm-news の本処理。cron タスクと管理用APIの両方からここを呼ぶ。news-run.ts と同じ構成で、
 * 3つの独立した処理に分かれている（別々の Cron Trigger・別々のAPIから呼ぶ＝別々の Worker 呼び出し＝
 * 別々の subrequest 予算で動く。理由は news-run.ts 冒頭コメントと同じ Cloudflare Workers の
 * subrequest 上限＝Freeプランは1回の呼び出しにつき50個）:
 *   - runFarmNewsDigest  : フィード収集→本文取得→要約・潮流分類→保存
 *   - runFarmNewsTrends  : 今日新着があった潮流だけ「いまの考察・予測」を書き直す
 *   - runFarmNewsArchive : 月次/年次の潮流アーカイブをバックフィル生成（news には無い farm-news 固有の処理）
 *
 * 途中で1つのソースや1記事が失敗しても全体は止めず、理由を errors に積んで続ける。
 */
import { todayJST } from '~/utils/jst'
import {
  FARM_NEWS_HISTORICAL_MAX_SNAPSHOTS_PER_RUN,
  FARM_NEWS_HISTORICAL_YEARS_BACK,
  FARM_NEWS_LOOKBACK_DAYS,
  FARM_NEWS_MAX_MONTH_SNAPSHOTS_PER_RUN,
  FARM_NEWS_MAX_PER_RUN,
  FARM_NEWS_MAX_YEAR_SNAPSHOTS_PER_RUN,
  FARM_NEWS_SOURCES,
  FARM_NEWS_TREND_LOOKBACK_DAYS,
  farmNewsSourceName,
} from '~/utils/farm-news-sources'
import { FARM_NEWS_CURRENTS } from '~/utils/farm-news-currents'
import {
  ensureFarmNewsTables,
  fetchArticleText,
  fetchFeed,
  insertItems,
  insertRun,
  insertSnapshot,
  loadCurrentContext,
  loadKnownUrls,
  loadMonthItems,
  loadMonthSnapshotsForYear,
  listCurrentsWithNewItems,
  listMonthsWithItems,
  listSnapshotPeriodKeys,
  parseFeed,
  upsertCurrentNarrative,
  type FeedEntry,
  type NewItemInput,
} from '~/server/utils/farm-news'
import {
  summarizeArticle,
  synthesizeCurrentNarrative,
  synthesizeHistoricalYearSnapshot,
  synthesizeMonthSnapshot,
  synthesizeYearSnapshot,
} from '~/server/utils/farm-news-ai'
import type { FarmNewsArchiveResult, FarmNewsHistoricalBackfillResult, FarmNewsRunResult } from '~/types/farm-news'

export interface FarmNewsEnv {
  WHISPER_DB?: any
  NUXT_ANTHROPIC_API_KEY?: string
}

const MAX_ENTRIES_PER_SOURCE = 30
/** news-run.ts と同じ安全マージンの考え方。8ソースなので上限は少し低めでよい。 */
const SUBREQUEST_BUDGET = 35
const INSERT_BATCH_SIZE = 5

function withinLookback(entry: FeedEntry, since: number): boolean {
  if (!entry.publishedAt) return true
  return new Date(entry.publishedAt).getTime() >= since
}

export async function runFarmNewsDigest(env: FarmNewsEnv, opts: { trigger: 'cron' | 'manual' }): Promise<FarmNewsRunResult> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const digestDate = todayJST()
  const errors: string[] = []
  console.log(`[farm-news] start trigger=${opts.trigger} date=${digestDate}`)

  let used = 0
  const spend = (n = 1) => {
    used += n
  }

  await ensureFarmNewsTables(db)
  spend()

  const since = Date.now() - FARM_NEWS_LOOKBACK_DAYS * 24 * 3600 * 1000
  const sources = FARM_NEWS_SOURCES.filter((s) => s.enabled)
  const candidates: FeedEntry[] = []

  for (const source of sources) {
    spend()
    try {
      const xml = await fetchFeed(source.url)
      const entries = parseFeed(xml, source.id).slice(0, MAX_ENTRIES_PER_SOURCE)
      const fresh = entries.filter((e) => withinLookback(e, since))
      console.log(`[farm-news] feed ${source.id}: ${entries.length}件中 ${fresh.length}件が対象期間`)
      candidates.push(...fresh)
    } catch (e: any) {
      const msg = `${source.name}: フィード取得に失敗（${e?.message ?? e}）`
      console.error(`[farm-news] ${msg}`)
      errors.push(msg)
    }
  }

  const byUrl = new Map<string, FeedEntry>()
  for (const e of candidates) if (!byUrl.has(e.url)) byUrl.set(e.url, e)
  const unique = [...byUrl.values()].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))

  const known = unique.length ? await loadKnownUrls(db, unique.map((e) => e.url)) : new Set<string>()
  spend()
  const fresh = unique.filter((e) => !known.has(e.url)).slice(0, FARM_NEWS_MAX_PER_RUN)
  console.log(`[farm-news] 対象${unique.length}件 / 既処理${known.size}件 / 今回候補${fresh.length}件（subrequest使用済み${used}）`)

  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  let newItems = 0
  let attempted = 0
  const pending: NewItemInput[] = []
  const sourceMap = new Map(sources.map((s) => [s.id, s]))

  async function flushPending() {
    if (!pending.length) return
    await insertItems(db, pending.splice(0, pending.length))
    spend()
  }

  if (fresh.length && !apiKey) {
    const msg = 'NUXT_ANTHROPIC_API_KEY が未設定のため要約できません'
    console.error(`[farm-news] ${msg}`)
    errors.push(msg)
  }

  if (apiKey) {
    for (const entry of fresh) {
      if (used + 2 > SUBREQUEST_BUDGET) {
        console.log(`[farm-news] subrequest予算(${SUBREQUEST_BUDGET})に近づいたため残り${fresh.length - attempted}件は次回に回す`)
        break
      }
      attempted++

      try {
        let body = ''
        let bodySource: 'article' | 'feed' = 'feed'

        if (entry.description.length < 600 && !sourceMap.get(entry.sourceId)?.skipArticleFetch) {
          spend()
          try {
            const article = await fetchArticleText(entry.url)
            if (article.length > entry.description.length) {
              body = article
              bodySource = 'article'
            }
          } catch (e: any) {
            console.log(`[farm-news] 本文取得を諦めてフィードの要約を使う: ${entry.url}（${e?.message ?? e}）`)
          }
        }
        if (!body) body = entry.description

        if (!body.trim()) {
          errors.push(`${farmNewsSourceName(entry.sourceId)}: 本文も要約も空（${entry.url}）`)
          continue
        }

        spend()
        const summary = await summarizeArticle(apiKey, {
          title: entry.title,
          url: entry.url,
          sourceName: farmNewsSourceName(entry.sourceId),
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
        console.log(`[farm-news] 要約: [${summary.importance}] ${summary.titleJa}（${summary.current} / ${bodySource}）`)
      } catch (e: any) {
        const msg = `${farmNewsSourceName(entry.sourceId)}: 要約に失敗（${e?.message ?? e}）`
        console.error(`[farm-news] ${msg} ${entry.url}`)
        errors.push(msg)
      }
    }
    await flushPending()
  }

  const deferred = apiKey ? fresh.length - attempted : 0
  if (deferred > 0) errors.push(`subrequest予算のため${deferred}件は次回の実行に持ち越し`)

  await insertRun(db, { digestDate, trigger: opts.trigger, fetched: unique.length, newItems, errors })

  console.log(`[farm-news] done new=${newItems} deferred=${deferred} errors=${errors.length} subrequest使用済み≈${used}`)
  return { digestDate, fetched: unique.length, newItems, errors }
}

function daysBeforeJST(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

export async function runFarmNewsTrends(env: FarmNewsEnv): Promise<{ updated: string[]; errors: string[] }> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  const errors: string[] = []
  if (!apiKey) return { updated: [], errors: ['NUXT_ANTHROPIC_API_KEY が未設定のため考察を更新できません'] }

  const digestDate = todayJST()
  const currentIds = await listCurrentsWithNewItems(db, digestDate)
  console.log(`[farm-news] trends: 本日新着があった潮流 = ${currentIds.join(', ') || '(なし)'}`)

  const since30 = daysBeforeJST(digestDate, FARM_NEWS_TREND_LOOKBACK_DAYS)
  const updated: string[] = []

  for (const currentId of currentIds) {
    const meta = FARM_NEWS_CURRENTS.find((c) => c.id === currentId)
    if (!meta) continue
    try {
      const context = await loadCurrentContext(db, currentId, since30, digestDate)
      const { sections, bullets } = await synthesizeCurrentNarrative(apiKey, {
        currentLabel: meta.label,
        currentDescription: meta.description,
        previousSections: context.previousSections,
        recentItems: context.recentItems,
        todayItems: context.todayItems,
      })
      await upsertCurrentNarrative(db, currentId, sections, bullets, context.recentItems.length)
      updated.push(currentId)
      console.log(`[farm-news] 考察を更新: ${meta.label}（直近30日${context.recentItems.length}件）`)
    } catch (e: any) {
      const msg = `${meta.label}: 考察の更新に失敗（${e?.message ?? e}）`
      console.error(`[farm-news] ${msg}`)
      errors.push(msg)
    }
  }

  return { updated, errors }
}

/**
 * 潮流アーカイブのバックフィル。「今月より前で、記事はあるのにまだスナップショットが無い月」を
 * 古い順に最大 FARM_NEWS_MAX_MONTH_SNAPSHOTS_PER_RUN 件生成し、続けて「もう過去になった年で、
 * 月次スナップショットが1件以上あるのにまだ年次が無い年」を最大 FARM_NEWS_MAX_YEAR_SNAPSHOTS_PER_RUN 件生成する。
 * 一度生成した期間は不変（insertSnapshot が INSERT OR IGNORE のため、作り直したいときは明示的にDELETEしてから再実行）。
 */
export async function runFarmNewsArchive(env: FarmNewsEnv): Promise<FarmNewsArchiveResult> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  const errors: string[] = []
  if (!apiKey) return { monthsCreated: [], yearsCreated: [], errors: ['NUXT_ANTHROPIC_API_KEY が未設定のためアーカイブを生成できません'] }

  await ensureFarmNewsTables(db)

  const currentMonthKey = todayJST().slice(0, 7)
  const currentYear = currentMonthKey.slice(0, 4)

  // 1. 月次スナップショット
  const monthsWithItems = await listMonthsWithItems(db)
  const existingMonths = await listSnapshotPeriodKeys(db, 'month')
  const monthsToCreate = monthsWithItems
    .filter((m) => m < currentMonthKey && !existingMonths.has(m))
    .slice(0, FARM_NEWS_MAX_MONTH_SNAPSHOTS_PER_RUN)

  const monthsCreated: string[] = []
  for (const monthKey of monthsToCreate) {
    try {
      const items = await loadMonthItems(db, monthKey)
      if (!items.length) continue
      const sections = await synthesizeMonthSnapshot(apiKey, { monthKey, items })
      if (!sections.length) continue
      await insertSnapshot(db, { periodType: 'month', periodKey: monthKey, sections, itemCount: items.length })
      monthsCreated.push(monthKey)
      console.log(`[farm-news] 月次アーカイブ生成: ${monthKey}（${items.length}件）`)
    } catch (e: any) {
      const msg = `${monthKey}: 月次アーカイブの生成に失敗（${e?.message ?? e}）`
      console.error(`[farm-news] ${msg}`)
      errors.push(msg)
    }
  }

  // 2. 年次スナップショット（1で増えた分も含めて月次の在庫から対象年を再計算する）
  const monthKeysAfter = await listSnapshotPeriodKeys(db, 'month')
  const years = new Set<string>()
  for (const key of monthKeysAfter) {
    const y = key.slice(0, 4)
    if (y < currentYear) years.add(y)
  }
  const existingYears = await listSnapshotPeriodKeys(db, 'year')
  const yearsToCreate = [...years].sort().filter((y) => !existingYears.has(y)).slice(0, FARM_NEWS_MAX_YEAR_SNAPSHOTS_PER_RUN)

  const yearsCreated: string[] = []
  for (const year of yearsToCreate) {
    try {
      const monthSnapshots = await loadMonthSnapshotsForYear(db, year)
      if (!monthSnapshots.length) continue
      const monthSummaries = monthSnapshots.map((s) => ({ periodKey: s.periodKey, body: s.sections.map((sec) => sec.body).join(' ') }))
      const sections = await synthesizeYearSnapshot(apiKey, { year, monthSummaries })
      if (!sections.length) continue
      const itemCount = monthSnapshots.reduce((sum, s) => sum + s.itemCount, 0)
      await insertSnapshot(db, { periodType: 'year', periodKey: year, sections, itemCount })
      yearsCreated.push(year)
      console.log(`[farm-news] 年次アーカイブ生成: ${year}（月次${monthSnapshots.length}ヶ月分）`)
    } catch (e: any) {
      const msg = `${year}: 年次アーカイブの生成に失敗（${e?.message ?? e}）`
      console.error(`[farm-news] ${msg}`)
      errors.push(msg)
    }
  }

  return { monthsCreated, yearsCreated, errors }
}

/**
 * 過去アーカイブのバックフィル（Web検索版）。runFarmNewsArchive は「実際に収集した記事」を材料にするが、
 * RSSフィードは直近の記事しか配信しないため、サイト運用開始（2026-09-14）より前の年はそもそも
 * 収集記事が存在せず、runFarmNewsArchive では永久に埋まらない。その代わりにここでは年ごとに
 * Claude の Web検索で1回だけ調べ物をさせ、年次スナップショットとして直接生成する
 * （1500日ぶんを日次/月次で埋めるのは費用に見合わないため、年単位の粗いサンプリングにしている）。
 *
 * 対象は「今年からFARM_NEWS_HISTORICAL_YEARS_BACK年前まで」のうち、①実際の収集記事が1件もない年
 * （＝listMonthsWithItemsに出てこない年。実データが貯まり始めた年は通常のrunFarmNewsArchiveに任せる）
 * ②まだ年次スナップショットが無い年、の両方を満たすものだけ。一度生成した年はinsertSnapshotの
 * INSERT OR IGNOREでそのまま不変（作り直すときは該当行を明示的にDELETEしてから再実行）。
 */
export async function runFarmNewsHistoricalBackfill(env: FarmNewsEnv): Promise<FarmNewsHistoricalBackfillResult> {
  const db = env.WHISPER_DB
  if (!db) throw new Error('WHISPER_DB バインディングが見つかりません')

  const apiKey = env.NUXT_ANTHROPIC_API_KEY ?? ''
  const errors: string[] = []
  if (!apiKey) return { yearsCreated: [], errors: ['NUXT_ANTHROPIC_API_KEY が未設定のため生成できません'] }

  await ensureFarmNewsTables(db)

  const currentYear = Number(todayJST().slice(0, 4))
  const monthsWithItems = await listMonthsWithItems(db)
  const yearsWithRealData = new Set(monthsWithItems.map((m) => m.slice(0, 4)))
  const existingYears = await listSnapshotPeriodKeys(db, 'year')

  const candidateYears: string[] = []
  for (let y = currentYear - FARM_NEWS_HISTORICAL_YEARS_BACK; y < currentYear; y++) {
    const key = String(y)
    if (yearsWithRealData.has(key) || existingYears.has(key)) continue
    candidateYears.push(key)
  }
  const yearsToCreate = candidateYears.slice(0, FARM_NEWS_HISTORICAL_MAX_SNAPSHOTS_PER_RUN)

  const yearsCreated: string[] = []
  for (const year of yearsToCreate) {
    try {
      const sections = await synthesizeHistoricalYearSnapshot(apiKey, { year })
      if (!sections.length) continue
      await insertSnapshot(db, { periodType: 'year', periodKey: year, sections, itemCount: 0 })
      yearsCreated.push(year)
      console.log(`[farm-news] 過去年アーカイブ生成（Web検索）: ${year}`)
    } catch (e: any) {
      const msg = `${year}: 過去年アーカイブの生成に失敗（${e?.message ?? e}）`
      console.error(`[farm-news] ${msg}`)
      errors.push(msg)
    }
  }

  return { yearsCreated, errors }
}
