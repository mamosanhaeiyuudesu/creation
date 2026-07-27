import {
  requireGuesthouseDb,
  ensureGuesthouseTables,
  loadHouse,
  buildKnowledgeBase,
  resolveSession,
  addMessage,
  loadMessages,
  createConsult,
} from '~/server/utils/guesthouse'
import { draftConsultReply } from '~/server/utils/guesthouse-ai'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import type { ChatMessage, ReplyKind, StayChatReply, StayChatRequest } from '~/types/guesthouse'

// お客様のチェックイン案内チャット（ログイン不要）。会話は滞在セッションとして永続化する。
// 事務質問は宿の案内情報だけを根拠に即答（auto）。観光相談・トラブル等は自分で答えず handoff にし、
// 会話スレッドに「確認しますね」を残しつつ、阪中さんの受信箱に相談＋AI下書きを作る（フェーズ2）。

function buildSystem(knowledge: string): string {
  return `あなたは、あるゲストハウスの「チェックイン案内AI」です。ホストは阪中さん。お客様（多くは海外からの旅行者）の事務的な質問に、下記の「宿の案内情報」だけを根拠に、丁寧に即答します。

# 絶対のルール
- 回答は必ず「宿の案内情報」に書かれている内容だけを根拠にする。書かれていないことは推測や一般論で埋めない。
- あなたは阪中さん本人ではありません。阪中さん本人になりすまさない（人間のフリをしない）。あなたは自動応答のAIです。
- 次のいずれかに当てはまる質問は、自分で答えず必ず阪中さんに引き継ぐ（kind="handoff"）:
  - 案内情報に答えが書かれていない事務的な質問。
  - 観光のおすすめ・食事・その人の旅程に合わせた提案など「心のこもった相談」。
  - トラブル・変更・キャンセル・体調・感情のこもったやり取りなど特別な対応。
- 引き継ぐときは正直に、やわらかく「阪中さんに確認しますね。少しお待ちください」という主旨を伝える（勝手に約束や憶測をしない）。

# 言語
- お客様が使った言語で答える（日本語なら日本語、英語なら英語）。自然でやさしい表現にする。

# 返信の形式（重要）
必ず次の JSON のみを返す。前後に説明やコードブロック記号を付けない。
{
  "kind": "auto" または "handoff",
  "reply": "お客様に見せる返信本文（お客様の言語で）"
}

# 宿の案内情報
${knowledge}`
}

export default defineEventHandler(async (event): Promise<StayChatReply> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  if (!/^[0-9a-f]{32}$/.test(token)) throw createError({ statusCode: 400, message: '不正なリンクです' })

  const house = await loadHouse(db, { shareToken: token })
  if (!house) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<StayChatRequest>(event)
  const message = (body?.message ?? '').trim()
  if (!message) throw createError({ statusCode: 400, message: '質問を入力してください' })

  // セッションを解決（無ければ新規発行）し、お客様の発言を保存する。
  const session = await resolveSession(db, house.id, body?.sessionId, body?.guestName)
  await addMessage(db, session.id, 'guest', message)

  // 直近の会話を文脈として Claude に渡す。
  const thread = await loadMessages(db, session.id)
  const history: ChatMessage[] = thread
    .slice(-12)
    .map((m) => ({ role: m.role === 'guest' ? 'user' : 'assistant', content: m.content }))
  // resolveSession 後の thread 末尾は今回の guest 発言。role マップ済み。

  const out = await callClaudeText(anthropicApiKey as string, {
    system: buildSystem(buildKnowledgeBase(house)),
    maxTokens: 700,
    messages: history,
  })

  const parsed = parseJsonLoose<{ kind?: string; reply?: string }>(out)
  const kind: ReplyKind = parsed?.kind === 'auto' ? 'auto' : 'handoff'
  let reply = (parsed?.reply ?? '').trim()
  if (!reply) reply = 'すみません、阪中さんに確認しますね。少しお待ちください。'

  if (kind === 'auto' && parsed?.kind === 'auto') {
    await addMessage(db, session.id, 'auto', reply, 'auto')
    return { sessionId: session.id, kind: 'auto', reply }
  }

  // handoff：会話には「確認しますね」を残し、阪中さんの受信箱に相談＋AI下書きを作る。
  await addMessage(db, session.id, 'auto', reply, 'handoff')
  let draft = ''
  try {
    draft = await draftConsultReply(anthropicApiKey as string, house, thread, message)
  } catch {
    draft = '' // 下書き生成に失敗しても相談自体は登録する（阪中さんが手で書ける）。
  }
  await createConsult(db, session.id, house.id, message, draft)

  return { sessionId: session.id, kind: 'handoff', reply }
})
