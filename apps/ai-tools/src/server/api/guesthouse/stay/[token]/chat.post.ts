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
import { triageGuestMessage, answerGuestMessage, draftConsultReply, draftEmergencyReply, draftInfoGapReply } from '~/server/utils/guesthouse-ai'
import { INFO_GAP_MARKER } from '~/server/utils/guesthouse-policy'
import type { ReplyKind, StayChatReply, StayChatRequest } from '~/types/guesthouse'

// お客様のチェックイン案内チャット（ログイン不要）。token はお客様1人ぶんの滞在セッションのトークン。
//
// 方針（匙加減は guesthouse-policy.ts に集約）：
//   - 原則、AI が自分で答える（auto）。宿の質問は案内情報を根拠に、観光等は一般知識＋Web検索で補う。
//   - 「本当に緊急・AIでは対応不能」なものだけゲストハウス管理人（人間）へ引き継ぐ（handoff）。
//     このとき会話には短い「すぐ取り次ぎます」を残し、管理人の受信箱に相談＋AI下書きを作る。
//   - 「宿そのもの」に関する質問で案内情報に書かれていない内容は、AIが分かりかねる旨だけで済ませず、
//     同様に必ず管理人への確認（handoff相当）に回す（INFO_GAP_MARKER）。

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
    // handoff：会話には短い「すぐ取り次ぎます」を残し、管理人の受信箱に相談＋AI下書きを作る。
    let reply = await draftEmergencyReply(apiKey, thread)
    if (!reply) reply = 'すぐにゲストハウス管理人に連絡します。少しだけお待ちください。'
    await addMessage(event, db, session.id, 'auto', reply, 'handoff')

    let draft = ''
    try {
      const tips = await loadHouseOwnerTipsText(db, house.id)
      draft = await draftConsultReply(apiKey, house, tips, thread, message)
    } catch {
      draft = '' // 下書き生成に失敗しても相談自体は登録する（管理人が手で書ける）。
    }
    await createConsult(event, db, session.id, house.id, message, draft)

    return { sessionId: session.id, kind: 'handoff' as ReplyKind, reply }
  }

  // ② 通常：AI が自分で答える（観光等は必要に応じて Web 検索で補う）。
  const tips = await loadHouseOwnerTipsText(db, house.id)
  const answer = await answerGuestMessage(apiKey, house, tips, thread)

  if (answer.includes(INFO_GAP_MARKER)) {
    // 宿の案内情報でカバーされていない事務的な質問 → 分かりかねる旨で終わらせず、必ず管理人へ確認に回す。
    let reply = await draftInfoGapReply(apiKey, thread)
    if (!reply) reply = 'ゲストハウス管理人に確認して、折り返しお伝えします。少しお待ちください。'
    await addMessage(event, db, session.id, 'auto', reply, 'handoff')

    let draft = ''
    try {
      draft = await draftConsultReply(apiKey, house, tips, thread, message)
    } catch {
      draft = '' // 下書き生成に失敗しても相談自体は登録する（管理人が手で書ける）。
    }
    await createConsult(event, db, session.id, house.id, message, draft)

    return { sessionId: session.id, kind: 'handoff' as ReplyKind, reply }
  }

  const reply = answer || 'すみません、うまくお答えできませんでした。もう一度質問していただけますか？'
  await addMessage(event, db, session.id, 'auto', reply, 'auto')

  return { sessionId: session.id, kind: 'auto' as ReplyKind, reply }
})
