import { requireGuesthouseUser, requireGuesthouseDb, ensureGuesthouseTables, loadTips } from '~/server/utils/guesthouse'
import { extractTips } from '~/server/utils/guesthouse-ai'
import type { TipExtractResult } from '~/types/guesthouse'

// 貼り付けたメモ/文章から「旅の情報」を話題ごとに抽出する（要ログイン・DB非保存の下書き）。
// 既存の項目と重複する内容は差分マージ（mergeId＝既存id）として返す。人が確認して保存する前提。
export default defineEventHandler(async (event): Promise<TipExtractResult> => {
  const user = await requireGuesthouseUser(event)
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)

  const body = await readBody<{ text: string }>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '取り込むテキストを入力してください' })
  if (text.length > 40000) throw createError({ statusCode: 400, message: 'テキストが長すぎます（4万文字まで）' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const existing = await loadTips(db, user.id)
  return await extractTips(anthropicApiKey as string, existing, text)
})
