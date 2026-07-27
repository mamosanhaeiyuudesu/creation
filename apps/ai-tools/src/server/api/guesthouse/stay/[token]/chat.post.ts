import { requireGuesthouseDb, ensureGuesthouseTables, loadHouse, buildKnowledgeBase } from '~/server/utils/guesthouse'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import type { ChatMessage, ChatReply, ChatRequest, ReplyKind } from '~/types/guesthouse'

// お客様のチェックイン案内チャット（ログイン不要）。宿の案内情報だけを根拠に AI が事務的な質問に即答する。
// 情報に無いこと・心のこもった相談（観光の相談・その人の旅程に合わせた提案）・トラブル・感情的なやり取りは
// 自分で答えず、正直に「阪中さんに確認します」と引く（＝ handoff）。人間のフリはしない（提案資料§3の核心）。

// system は knowledge base を差し込むため handler 内で組み立てる。
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
- kind="auto": 案内情報だけで答えられる事務的な質問に、その内容で即答したとき。
- kind="handoff": 上記の引き継ぎ条件に当てはまるとき。reply は阪中さんに確認する旨のみ。

# 宿の案内情報
${knowledge}`
}

export default defineEventHandler(async (event): Promise<ChatReply> => {
  const db = requireGuesthouseDb(event)
  await ensureGuesthouseTables(db)
  const token = getRouterParam(event, 'token') || ''
  if (!/^[0-9a-f]{32}$/.test(token)) throw createError({ statusCode: 400, message: '不正なリンクです' })

  const house = await loadHouse(db, { shareToken: token })
  if (!house) throw createError({ statusCode: 404, message: 'この共有リンクは無効です' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<ChatRequest>(event)
  const history = Array.isArray(body?.messages) ? body!.messages : []
  // 直近の履歴だけ渡す（暴走・肥大防止）。末尾はお客様の新しい質問である想定。
  const messages: ChatMessage[] = history
    .filter((m) => (m?.role === 'user' || m?.role === 'assistant') && (m?.content ?? '').trim())
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.trim() }))
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    throw createError({ statusCode: 400, message: '質問を入力してください' })
  }

  const out = await callClaudeText(anthropicApiKey as string, {
    system: buildSystem(buildKnowledgeBase(house)),
    maxTokens: 700,
    messages,
  })

  const parsed = parseJsonLoose<{ kind?: string; reply?: string }>(out)
  const kind: ReplyKind = parsed?.kind === 'auto' ? 'auto' : 'handoff'
  const reply = (parsed?.reply ?? '').trim()
  // パース失敗や空返信は、勝手に事務回答したことにせず安全側（handoff）に倒す。
  if (!reply) {
    return { kind: 'handoff', reply: 'すみません、阪中さんに確認しますね。少しお待ちください。' }
  }
  return { kind, reply }
})
