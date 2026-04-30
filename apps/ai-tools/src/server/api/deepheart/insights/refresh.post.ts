import {
  MIN_MESSAGES_FOR_INSIGHT,
  generateInsight,
  getUserMessageTexts,
  saveInsight,
} from '~/server/utils/deepheart-insights'
import { requireDeepheartUser, getDeepheartDb, getDeepheartEncryptionKey } from '~/server/utils/deepheart'

export default defineEventHandler(async (event) => {
  const user = await requireDeepheartUser(event)
  const db = getDeepheartDb(event)
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const encKey = getDeepheartEncryptionKey(event)
  const messages = await getUserMessageTexts(db, user.id, encKey)

  if (messages.length < MIN_MESSAGES_FOR_INSIGHT) {
    throw createError({
      statusCode: 422,
      data: { tooFewMessages: true, messageCount: messages.length, required: MIN_MESSAGES_FOR_INSIGHT },
      message: `気づきを生成するには${MIN_MESSAGES_FOR_INSIGHT}件以上のメッセージが必要です（現在${messages.length}件）`,
    })
  }

  const { openaiApiKey } = useRuntimeConfig(event)
  if (!openaiApiKey) throw createError({ statusCode: 500, message: 'APIキーが設定されていません' })

  const insight = await generateInsight(messages, openaiApiKey as string)
  if (!insight) throw createError({ statusCode: 500, message: '分析の生成に失敗しました。もう一度お試しください。' })

  const { createdAt } = await saveInsight(db, user.id, insight, messages.length, encKey)

  return { insight, createdAt, messageCount: messages.length }
})
