import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, getOwnedHouse, loadDiaries } from '~/server/utils/guesthouse'
import { computeTrends } from '~/server/utils/guesthouse-ai'
import type { Trends } from '~/types/guesthouse'

// 傾向ダッシュボード（学習ループ）。宿のお客さん日記からAIが傾向を抽出する。
export default defineEventHandler(async (event): Promise<Trends> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const house = await getOwnedHouse(db, user.id, id)
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const diaries = await loadDiaries(db, id)
  if (diaries.length < 2) return { items: [], basedOn: diaries.length }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const items = await computeTrends(anthropicApiKey as string, diaries)
  return { items, basedOn: diaries.length }
})
