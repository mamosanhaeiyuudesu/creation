import { callClaudeText } from '~/server/utils/anthropic'

// 職業・人物像(occupation/note)から、記号の上に常時表示する20文字程度の特徴要約を作る。
// 詳細パネルで occupation/note を編集して保存するたびに裏側で呼ばれる(専用の入力欄はUIに置かない)。

const SYSTEM = `あなたはジェノグラム(家系図)作成ツールのアシスタントです。
人物の「職業」と「人物像(エピソード・気づき・関係性の背景など)」から、記号のすぐ上に常時表示する短い特徴要約を作ってください。

ルール:
1. 全角・半角を問わず20文字以内に必ず収める(絶対に超えないこと)。20文字に収まるよう、要素を削って良い。
2. 職業が分かればそれを核にする。性格・特徴・立場が読み取れれば、収まる範囲で中黒(・)区切りで短く加える。
3. 「〜な人」のような文章ではなく、体言止め・単語の羅列にする。
4. 職業も人物像も無ければ、空文字を返す。
5. 出力は要約の文字列のみ。説明・引用符・句点は付けない。`

export default defineEventHandler(async (event) => {
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic APIキーが設定されていません。' })

  const body = await readBody<{ occupation?: string; note?: string }>(event)
  const occupation = (body?.occupation ?? '').trim()
  const note = (body?.note ?? '').trim()
  if (!occupation && !note) return { summary: '' }

  const out = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 200,
    messages: [
      {
        role: 'user',
        content: `職業: ${occupation || '(不明)'}\n人物像: ${note || '(不明)'}\n\n上記から特徴要約を1つ出力してください。`,
      },
    ],
  })

  // 万一AIが20文字を超えて返しても、表示側が壊れないよう最後の安全策として切り詰める
  // (通常は指示どおり収まるため、ここに来るのは想定外のケースのみ)
  const summary = out.trim().slice(0, 20)
  return { summary }
})
