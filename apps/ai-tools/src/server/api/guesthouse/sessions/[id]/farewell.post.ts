import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, loadHouse } from '~/server/utils/guesthouse'
import { generateFarewell } from '~/server/utils/guesthouse-ai'
import type { FarewellDraft } from '~/types/guesthouse'

// 宿泊後のお礼メッセージ＆レビュー依頼文の下書きを生成する（保存はしない・確認用）。F3。
export default defineEventHandler(async (event): Promise<FarewellDraft> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(event, db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const house = await loadHouse(db, { userId: user.id, houseId: detail.houseId })
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  return await generateFarewell(anthropicApiKey as string, house, detail.messages, detail.guestName)
})
