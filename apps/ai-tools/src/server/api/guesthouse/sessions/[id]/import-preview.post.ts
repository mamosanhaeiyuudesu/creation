import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadSessionDetail, loadHouse } from '~/server/utils/guesthouse'
import { parseBookingThread } from '~/server/utils/guesthouse-import'
import { classifyImportedMessages } from '~/server/utils/guesthouse-ai'
import type { ImportedMessage } from '~/types/guesthouse'

// Booking.com等の会話をコピペした原文から、メッセージを機械的に分割し、AIで発言者(ゲスト/阪中さん)を分類する（保存はしない・確認用）。
export default defineEventHandler(async (event): Promise<{ items: ImportedMessage[] }> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const id = getRouterParam(event, 'id') || ''

  const detail = await loadSessionDetail(event, db, user.id, id)
  if (!detail) throw createError({ statusCode: 404, message: '会話が見つかりません' })

  const house = await loadHouse(db, { userId: user.id, houseId: detail.houseId })
  if (!house) throw createError({ statusCode: 404, message: '宿が見つかりません' })

  const body = await readBody<{ text: string }>(event)
  const text = String(body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '取り込むテキストを貼り付けてください' })

  const parsed = parseBookingThread(text)
  if (!parsed.length) throw createError({ statusCode: 400, message: 'メッセージを認識できませんでした。貼り付け内容をご確認ください。' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const roles = await classifyImportedMessages(
    anthropicApiKey as string,
    house,
    parsed.map((m) => m.content)
  )
  const items: ImportedMessage[] = parsed.map((m, i) => ({ content: m.content, createdAt: m.createdAt, role: roles[i] ?? 'guest' }))
  return { items }
})
