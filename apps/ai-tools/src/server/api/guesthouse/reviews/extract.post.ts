import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables } from '~/server/utils/guesthouse'
import { extractReviews } from '~/server/utils/guesthouse-ai'
import type { ReviewExtractResult } from '~/types/guesthouse'

// 貼り付けたレビュー・意見の長文を、AIが1件ずつの声に切り分ける（保存前の下書き候補）。
export default defineEventHandler(async (event): Promise<ReviewExtractResult> => {
  await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<{ text?: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: 'テキストを入力してください' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  return await extractReviews(anthropicApiKey as string, text)
})
