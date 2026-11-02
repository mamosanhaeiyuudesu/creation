import { requirePaletteUser } from '~/server/utils/palette'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'

// 日本語の「描きたい絵」を、絵として決まっていない要素（構図・場所・光・画風など）を補った3案に膨らませる。
// 返すのは日本語。人が直したうえで、生成時に translate で英語化する。DB には保存しない。
const MODEL = 'claude-haiku-5-5'
const MAX_CHARS = 2000
const COUNT = 3

const SYSTEM = `あなたは画像生成モデル FLUX で絵を描く人の、プロンプト相談役です。ユーザーが日本語で書いた「描きたい絵」は曖昧なことが多く、そのままだと、決まっていない部分をモデルが好き勝手に埋めてしまいます。そこで、決まっていない要素を具体的に補った案を ${COUNT} つ、日本語で提案します。

補う要素の例: 人物の年齢・服・表情・ポーズ、場所、構図（アングル・距離）、光、時間帯、雰囲気、画風。

ルール:
- 元の文の意味と主役は変えない。元に書かれた要素は残し、書かれていない要素を3〜5個ほど具体化する。
- ${COUNT} 案は方向性をはっきり変える（例: 写真のようなリアル／イラスト・絵画調／幻想的・劇的、など）。似た案を並べない。
- 各案は、絵の描写として読める1〜3文の日本語（60〜160字）。「〜してください」のような指示文にしない。
- 画像生成モデルが苦手な題材（鏡・ガラスの映り込み、手元の細かい動作、文字、複数人の細かい位置関係）は、崩れにくい構図に寄せて書く。例えば鏡なら「背中越しに、鏡に映る顔が見える」のように、見える範囲を具体的に決める。
- 人物が登場する場合は、国籍・人種の指定がなければ日本人として描写する（「30代の日本人男性」のように書く）。ユーザーが別の国籍・人種を書いているとき、人間以外のときは付けない。
- 固有名詞の人物・キャラクター・作品名は足さない。
- 出力は JSON だけ。説明やコードブロックは付けない。形式: {"suggestions":["案1","案2","案3"]}`

export default defineEventHandler(async (event) => {
  await requirePaletteUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ text?: string }>(event)
  const text = String(body?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 400, message: '描きたい絵を書いてください' })
  if (text.length > MAX_CHARS) throw createError({ statusCode: 400, message: `長すぎます（${MAX_CHARS}文字まで）` })

  const raw = await callClaudeText(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 1200,
    model: MODEL,
    messages: [{ role: 'user', content: text }],
  })
  const parsed = parseJsonLoose<{ suggestions?: unknown }>(raw)
  const suggestions = (Array.isArray(parsed?.suggestions) ? parsed!.suggestions : [])
    .map((s) => String(s ?? '').trim())
    .filter(Boolean)
    .slice(0, COUNT)
  if (!suggestions.length) throw createError({ statusCode: 502, message: '案を作れませんでした。もう一度試してください。' })
  return { suggestions }
})
