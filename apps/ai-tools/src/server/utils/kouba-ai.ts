// 工数管理ツール (kouba) のアイコン生成。カテゴリ名・タスク名から Claude に SVG アイコンを描かせる。
// 表示側は <img> の data URL で出す（types/kouba.ts の svgIconDataUrl）ので、ここでは形の検証と最低限の掃除だけ行う。
import { callClaudeText } from '~/server/utils/anthropic'
import { isSvgIcon } from '~/types/kouba'
import type { KoubaIconTarget } from '~/types/kouba'

/** これを超える SVG は保存しない（D1 の1行を無駄に太らせない・描き込みすぎの抑止）。 */
const MAX_SVG_LENGTH = 12000

const SYSTEM = `あなたは小さなアプリアイコンを描くデザイナーです。与えられた名前を表す SVG アイコンを1つ描いてください。

# 形式
- 出力は <svg> 要素だけ。前後に説明文やコードブロック記号を付けない
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"> で始める（width/height 属性は付けない）
- 最初に角丸の背景 <rect x="0" y="0" width="64" height="64" rx="14" .../> を敷く。明るい背景にも暗い背景にも置かれるため
- その上に、名前の意味が一目で伝わるモチーフを1つ、中央に大きく描く

# 描き方
- 28px 程度に縮小しても判別できる、太めの線と大きな面のフラットデザイン
- 色は背景を含めて2〜4色。背景とモチーフははっきりコントラストを付ける
- 文字（<text>）は使わない。名前が抽象的なら、連想される具体物で象徴する
- 使ってよい要素: rect, circle, ellipse, line, polyline, polygon, path, g, linearGradient, radialGradient, stop, defs
- script, foreignObject, image, 外部参照、アニメーションは使わない`

interface GenerateOptions {
  target: KoubaIconTarget
  name: string
  /** ユーザーからの作り直しの指示（例: もっとシンプルに）。空なら名前から新しく描く。 */
  instruction?: string
  /** いまのアイコン。SVG なら指示の土台として渡す（絵文字なら渡さない）。 */
  currentIcon?: string
}

function buildUserMessage(opts: GenerateOptions): string {
  const label = opts.target === 'category' ? 'カテゴリ（仕事の大きな分類）' : 'タスク（カテゴリの中の作業）'
  const lines = [`種類: ${label}`, `名前: ${opts.name}`]
  const current = opts.currentIcon && isSvgIcon(opts.currentIcon) ? opts.currentIcon : ''
  const instruction = opts.instruction?.trim() ?? ''
  if (instruction) {
    if (current) lines.push('', 'いまのアイコン:', current)
    lines.push('', `次の指示に沿って${current ? 'いまのアイコンを描き直して' : '描いて'}ください。指示に書かれていない点は${current ? 'いまのアイコンを保って' : '自由に決めて'}ください。`, `指示: ${instruction}`)
  } else if (current) {
    lines.push('', 'いまのアイコン:', current, '', 'いまのアイコンとは違うモチーフ・配色で、新しく描き直してください。')
  }
  return lines.join('\n')
}

/** 応答から <svg>…</svg> を取り出し、表示に不要で危険になり得る要素・属性を落とす。取れなければ null。 */
export function extractSvg(raw: string): string | null {
  const match = raw.match(/<svg[\s\S]*<\/svg>/i)
  if (!match) return null
  let svg = match[0]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\s(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, '')
  // <img> で表示するには xmlns が必須（無いと描画されない）
  if (!/^<svg[^>]*\sxmlns=/i.test(svg)) svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  if (svg.length > MAX_SVG_LENGTH) return null
  return svg
}

/** 名前（＋任意の指示）から SVG アイコンを1つ生成する。失敗時は createError を throw。 */
export async function generateKoubaIcon(apiKey: string, opts: GenerateOptions): Promise<string> {
  const raw = await callClaudeText(apiKey, {
    system: SYSTEM,
    maxTokens: 4000,
    messages: [{ role: 'user', content: buildUserMessage(opts) }],
  })
  const svg = extractSvg(raw)
  if (!svg) throw createError({ statusCode: 502, message: 'アイコンを生成できませんでした。もう一度お試しください' })
  return svg
}
