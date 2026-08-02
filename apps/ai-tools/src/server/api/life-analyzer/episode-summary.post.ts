import {
  buildSourceText,
  ensureLifeTables,
  loadAnalysis,
  loadDocuments,
  loadEpisodeSummary,
  loadTitleMap,
  requireLifeDb,
  requireLifeUser,
  saveEpisodeSummary,
} from '~/server/utils/life-analyzer'
import { summarizeEpisode } from '~/server/utils/life-analyzer-ai'
import type { EpisodeSummary } from '~/types/life-analyzer'

// 出来事ノードをクリックしたときのポップアップ用。1度作った要約はキャッシュから返す。
export default defineEventHandler(async (event): Promise<EpisodeSummary & { cached: boolean }> => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)

  const body = await readBody<{ analysisId?: string; nodeKey?: string; force?: boolean }>(event)
  const analysisId = (body?.analysisId ?? '').trim()
  const nodeKey = (body?.nodeKey ?? '').trim()
  if (!analysisId || !nodeKey) throw createError({ statusCode: 400, message: 'analysisId と nodeKey は必須です' })

  if (!body?.force) {
    const cached = await loadEpisodeSummary<EpisodeSummary>(event, db, analysisId, nodeKey)
    if (cached) return { ...cached, cached: true }
  }

  const titles = await loadTitleMap(db, user.id)
  const analysis = await loadAnalysis(event, db, user.id, analysisId, titles)
  if (!analysis) throw createError({ statusCode: 404, message: '分析が見つかりません' })

  const core = analysis.cores.find((c) => nodeKey.startsWith(`${c.key}-`))
  const episode = core?.episodes.find((e) => e.key === nodeKey)
  if (!core || !episode) throw createError({ statusCode: 404, message: '出来事が見つかりません' })

  const docs = await loadDocuments(event, db, user.id, analysis.docIds)
  if (!docs.length) throw createError({ statusCode: 404, message: '元のテキストが見つかりません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const result = await summarizeEpisode(anthropicApiKey as string, {
    sourceText: buildSourceText(docs),
    polarity: core.polarity,
    coreLabel: core.label,
    coreDescription: core.description,
    episodeLabel: episode.label,
    episodeDetail: episode.detail,
  })

  await saveEpisodeSummary(event, db, analysisId, nodeKey, result)
  return { ...result, cached: false }
})
