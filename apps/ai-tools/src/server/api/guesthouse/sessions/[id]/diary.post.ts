import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, loadHouse } from '~/server/utils/guesthouse'
import { generateDiary } from '~/server/utils/guesthouse-ai'
import type { DiaryContent } from '~/types/guesthouse'

// 会話からお客さん日記の下書きを生成する（保存はしない・確認用）。F2。
export default defineEventHandler(async (event): Promise<{ content: DiaryContent; summary: string }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })
  if (!detail.messages.length) throw createError({ statusCode: 400, message: 'まだ会話がありません' })

  const house = await loadHouse(db, { userId: user.id, houseId: detail.houseId })
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  return await generateDiary(anthropicApiKey as string, house, detail.messages, detail.guestName)
})
