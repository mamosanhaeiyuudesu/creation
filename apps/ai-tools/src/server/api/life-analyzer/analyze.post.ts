import {
  analysisSignature,
  buildSourceText,
  ensureLifeTables,
  insertAnalysis,
  loadCachedAnalysis,
  loadDocuments,
  loadTitleMap,
  requireLifeDb,
  requireLifeUser,
} from '~/server/utils/life-analyzer'
import { analyzeCores } from '~/server/utils/life-analyzer-ai'
import type { LifeAnalysis } from '~/types/life-analyzer'

// 選ばれたテキスト（1件でも複数件でも可）から影5・光5のコアを抽出する。
// 同じ組み合わせの分析は使い回す。force=true のときだけ AI を呼び直す。
// cacheOnly=true は画面を開いた直後の復元用＝キャッシュが無ければ null を返し、勝手にAIを呼ばない。
export default defineEventHandler(async (event): Promise<LifeAnalysis | null> => {
  const user = await requireLifeUser(event)
  const db = requireLifeDb(event)
  await ensureLifeTables(db)

  const body = await readBody<{ docIds?: string[]; force?: boolean; cacheOnly?: boolean }>(event)
  const docIds = Array.isArray(body?.docIds) ? body!.docIds!.filter((v) => typeof v === 'string' && v) : []
  if (!docIds.length) throw createError({ statusCode: 400, message: '分析するテキストを選んでください' })

  const titles = await loadTitleMap(db, user.id)
  const signature = analysisSignature(docIds)

  if (!body?.force) {
    const cached = await loadCachedAnalysis(event, db, user.id, signature, titles)
    if (cached) return { ...cached, fresh: false }
  }
  if (body?.cacheOnly) return null

  const docs = await loadDocuments(event, db, user.id, docIds)
  if (!docs.length) throw createError({ statusCode: 404, message: 'テキストが見つかりません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const { overview, cores } = await analyzeCores(anthropicApiKey as string, buildSourceText(docs))

  const id = crypto.randomUUID()
  const ids = docs.map((d) => d.id)
  await insertAnalysis(event, db, user.id, { id, docIds: ids, signature, overview, cores })

  return {
    id,
    docIds: ids,
    docTitles: docs.map((d) => d.title),
    overview,
    cores,
    createdAt: new Date().toISOString(),
    fresh: true,
  }
})
