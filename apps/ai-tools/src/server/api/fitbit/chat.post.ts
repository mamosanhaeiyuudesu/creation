import { resolveUserId, getStatus, getRawHistory } from '~/server/utils/fitbit'
import { answerChat } from '~/server/utils/fitbit-chat'
import { listThread, appendChatMessage, toConversation } from '~/server/utils/fitbit-thread'
import { todayJST } from '~/utils/jst'

/** 継続スレッドに対話を1ターン追記する。過去の健康データ＋これまでの会話を根拠に返信する。 */
export default defineEventHandler(async (event) => {
  const userId = await resolveUserId(event)
  if (!userId) throw createError({ statusCode: 401, message: '未ログイン' })

  const body = await readBody<{ content?: string; date?: string; days?: number }>(event)
  const content = (body?.content ?? '').trim().slice(0, 2000)
  if (!content) throw createError({ statusCode: 400, message: 'メッセージが空です' })

  const date = body?.date || todayJST()
  const days = Math.min(31, Math.max(7, Number(body?.days) || 30))

  const status = await getStatus(event, userId)
  if (!status.connected) throw createError({ statusCode: 428, message: 'Fitbit未連携' })

  const history = await getRawHistory(event, userId, date, days)
  if (!history.length) throw createError({ statusCode: 502, message: 'データ取得に失敗しました' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  // ユーザー発言を保存 → これまでのスレッドを会話文脈にして返信生成 → 返信を保存
  const userMsg = await appendChatMessage(event, userId, 'user', content)
  const thread = await listThread(event, userId)
  const answer = await answerChat(anthropicApiKey as string, history, toConversation(thread))
  const assistantMsg = await appendChatMessage(event, userId, 'assistant', answer)

  return { user: userMsg, assistant: assistantMsg }
})
