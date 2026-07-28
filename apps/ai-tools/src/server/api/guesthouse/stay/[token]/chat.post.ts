import {
  requireGuesthouseDb,
  ensureGuesthouseTables,
  loadStaySession,
  updateGuestNameIfChanged,
  addMessage,
  loadMessages,
  createConsult,
  loadHouseOwnerTipsText,
  reopenSession,
} from '~/server/utils/guesthouse'
import { triageGuestMessage, answerGuestMessage, draftConsultReply, draftEmergencyReply } from '~/server/utils/guesthouse-ai'
import type { ReplyKind, StayChatReply, StayChatRequest } from '~/types/guesthouse'

// お客様のチェックイン案内チャット（ログイン不要）。token はお客様1人ぶんの滞在セッションのトークン。
//
// 方針（匙加減は guesthouse-policy.ts に集約）：
//   - 原則、AI が自分で答える（auto）。宿の質問は案内情報を根拠に、観光等は一般知識＋Web検索で補う。
//   - 「本当に緊急・AIでは対応不能」なものだけ阪中さん（人間）へ引き継ぐ（handoff）。
//     このとき会話には短い「すぐ取り次ぎます」を残し、阪中さんの受信箱に相談＋AI下書きを作る。

export default defineEventHandler(async (event): Promise<StayChatReply> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''

  // token はホストが発行した滞在セッションのトークン。そこから宿とセッションを解決する。
  const resolved = await loadStaySession(db, token)
  if (!resolved) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })
  const { session, house } = resolved

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })
  const apiKey = anthropicApiKey as string

  const body = await readBody<StayChatRequest>(event)
  const message = (body?.message ?? '').trim()
  if (!message) throw createError({ statusCode: 400, message: '質問を入力してください' })

  // お客様が名前を入力・変更していれば反映し、お客様の発言を保存する。
  await updateGuestNameIfChanged(event, db, session, body?.guestName)
  await addMessage(event, db, session.id, 'guest', message)
  // クローズ済みのチャットにお客様から新しい発言が来たら、進行中に戻す（取りこぼし防止）。
  if (session.status === 'closed') await reopenSession(db, session.id)

  const thread = await loadMessages(event, db, session.id) // 末尾は今回の guest 発言

  // ① 緊急判定（人間へ引き継ぐべきか）。
  const { emergency } = await triageGuestMessage(apiKey, thread)

  if (emergency) {
    // handoff：会話には短い「すぐ取り次ぎます」を残し、阪中さんの受信箱に相談＋AI下書きを作る。
    let reply = await draftEmergencyReply(apiKey, thread)
    if (!reply) reply = 'すぐにホスト（阪中さん）に連絡します。少しだけお待ちください。'
    await addMessage(event, db, session.id, 'auto', reply, 'handoff')

    let draft = ''
    try {
      const tips = await loadHouseOwnerTipsText(db, house.id)
      draft = await draftConsultReply(apiKey, house, tips, thread, message)
    } catch {
      draft = '' // 下書き生成に失敗しても相談自体は登録する（阪中さんが手で書ける）。
    }
    await createConsult(event, db, session.id, house.id, message, draft)

    return { sessionId: session.id, kind: 'handoff' as ReplyKind, reply }
  }

  // ② 通常：AI が自分で答える（観光等は必要に応じて Web 検索で補う）。
  const tips = await loadHouseOwnerTipsText(db, house.id)
  let reply = await answerGuestMessage(apiKey, house, tips, thread)
  if (!reply) reply = 'すみません、うまくお答えできませんでした。もう一度質問していただけますか？'
  await addMessage(event, db, session.id, 'auto', reply, 'auto')

  return { sessionId: session.id, kind: 'auto' as ReplyKind, reply }
})
