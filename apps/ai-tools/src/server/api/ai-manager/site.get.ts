import { aiManagerSite, requireAiManagerAdmin } from '~/server/utils/ai-manager'

// 呼び出し箇所1件の全版（プロンプト・共通処理の本文つき）。id はパスと '#' を含むのでクエリで受け取る。
export default defineEventHandler(async (event) => {
  await requireAiManagerAdmin(event)
  const id = String(getQuery(event).id ?? '')
  const site = aiManagerSite(id)
  if (!site) throw createError({ statusCode: 404, message: '見つかりません' })
  return site
})
