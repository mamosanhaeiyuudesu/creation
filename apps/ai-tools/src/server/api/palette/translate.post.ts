import { requirePaletteUser } from '~/server/utils/palette'
import { callClaudeText } from '~/server/utils/anthropic'

// 日本語の指示を、FLUX 向けの英語プロンプトに変換する。DB には保存しない。
const MODEL = 'claude-haiku-5-5'
const MAX_CHARS = 2000

const SYSTEM = `あなたは画像生成モデル FLUX のプロンプトを書く翻訳者です。ユーザーが日本語で書いた「描きたい絵」の説明を、FLUX がよく理解する英語のプロンプトに変換します。

ルール:
- 1つの自然な英語の文章（またはカンマ区切りの短い句）で、被写体 → 状況・構図 → 光・雰囲気 → 画風、の順にまとめる。
- ユーザーが書いたことは落とさず、書いていない要素（人物・背景・小物・画風など）は足さない。
- 画風・カメラ・光の指定（例:「水彩」「逆光」「望遠」）は、英語の定番の言い回しにそろえる。
- 固有名詞や、英語にしづらい語は、意味が伝わるローマ字か短い説明にする。
- すでに英語で書かれていれば、意味を変えずに軽く整える。
- 「トリガーワード」が渡されたら、プロンプトの先頭にそのままの綴りで入れる（訳さない・変えない）。
- 出力は英語のプロンプトだけ。説明、引用符、見出し、コードブロックは付けない。`

export default defineEventHandler(async (event) => {
  await requirePaletteUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ text?: string; triggers?: string[] }>(event)
  const text = String(body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '日本語の文章を入力してください' })
  if (text.length > MAX_CHARS) throw createError({ statusCode: 400, message: `長すぎます（${MAX_CHARS}文字まで）` })
  const triggers = (Array.isArray(body?.triggers) ? body!.triggers! : [])
    .map((t) => String(t).trim())
    .filter(Boolean)
    .slice(0, 5)

  const content = triggers.length
    ? `トリガーワード: ${triggers.join(', ')}\n\n${text}`
    : text

  const prompt = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 500,
    model: MODEL,
    messages: [{ role: 'user', content }],
  })
  // モデルが付けてしまった囲みの引用符・コードフェンスだけ落とす
  const cleaned = prompt.replace(/^```\w*\n?|\n?```$/g, '').replace(/^["“](.*)["”]$/s, '$1').trim()
  if (!cleaned) throw createError({ statusCode: 502, message: '変換結果が空でした。もう一度試してください。' })
  return { prompt: cleaned }
})
