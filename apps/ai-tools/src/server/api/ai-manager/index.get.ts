import { aiManagerIndex, requireAiManagerAdmin } from '~/server/utils/ai-manager'

// 呼び出し箇所の一覧と、各版のモデル・オプション・変更の要約（プロンプト本文は含めない）。
export default defineEventHandler(async (event) => {
  await requireAiManagerAdmin(event)
  return aiManagerIndex()
})
