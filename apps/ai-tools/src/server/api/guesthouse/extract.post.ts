import { requireGuesthouseUser } from '~/server/utils/guesthouse'
import { extractFacts } from '~/server/utils/guesthouse-ai'
import type { ExtractRequest, ExtractResult } from '~/types/guesthouse'

// 阪中さんの既存メモ・ウェルカム文・会話ログを Claude が読み、チェックイン案内チャットの
// 知識ベースになる「事務案内Q&A」を抽出する（要ログイン・DBには保存しない下書き）。
// 長文はサーバー側で段落チャンクに分割して投げ、結果をマージする（guesthouse-ai.ts）。
// ⚠ 抽出結果は保存前に人が確認する前提。個人情報や一過性の内容は落とす。
export default defineEventHandler(async (event): Promise<ExtractResult> => {
  await requireGuesthouseUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<ExtractRequest>(event)
  const text = (body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '取り込むテキストを入力してください' })
  if (text.length > 40000) throw createError({ statusCode: 400, message: 'テキストが長すぎます（4万文字まで）' })

  return await extractFacts(anthropicApiKey as string, text)
})
