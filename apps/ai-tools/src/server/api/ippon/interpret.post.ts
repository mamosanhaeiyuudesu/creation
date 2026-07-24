import { requireIpponUser, normalizeStyle } from '~/server/utils/ippon'
import { callClaudeVision, parseJsonLoose } from '~/server/utils/anthropic'
import type { Interpretation, InterpretRequest, StylePreset } from '~/types/ippon'

// スケッチ（写真/線画）を Claude が読み解き、3D生成用の形状記述に変換する（仕様§3.3 / §4.2）。
// ⚠ DBには保存しない。あくまで下書き。顧客に見せる前に人が1画面で確認する。

const STYLE_HINT: Record<StylePreset, string> = {
  natural: 'natural wood, warm oak veneer, soft matte finish',
  modern: 'minimal, clean straight lines, light neutral tones',
  industrial: 'raw steel frame, dark metal and wood, utilitarian',
  white: 'all-white, seamless, gallery-like',
}

const SYSTEM = `あなたは什器・インテリア設計者のアシスタントです。顧客との打合せで描かれた手描きスケッチ（多くは罫線ノートやコピー用紙）を読み解き、3D生成AIに渡すための形状記述に変換します。

目的は「顧客にイメージを伝えること」であり、製作精度は求めません。だから積極的に補完してよいです。ただし補完した点は必ず completions に日本語で列挙し、設計者が顧客に見せる前に気づけるようにしてください（例:「背面パネルを補った」「材質は指定が無いためオーク突板と仮定」）。

読み取りの方針:
- 何の家具・什器か（category）を日本語で判定する（例: 壁面収納棚 / カウンター / 陳列台 / テーブル）。
- 概算サイズ(mm)を推定する。スケッチに寸法メモがあれば最優先で採用。無ければ什器として自然な寸法を推定してよい（推定した旨を completions に書く）。読めない軸だけ null。
- 収納什器なら棚段数(shelves)を数える。棚が無い形なら 0。
- 脚部の有無(has_legs)を判断する。
- 材質(material)を推定する。補足テキストやスタイル指定を反映する。
- prompt_en は3D生成AI向けの英語プロンプト。形状・比率・材質・スタイルを簡潔に。寸法値は書かず形の説明に集中する。
- summary は日本語ひとことの読み取り要約。

必ず JSON のみを返す。前後に説明文やコードブロック記号を付けない。`

export default defineEventHandler(async (event) => {
  await requireIpponUser(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<InterpretRequest>(event)
  const sketch = (body?.sketch ?? '').trim()
  if (!/^data:image\/.+;base64,/.test(sketch)) throw createError({ statusCode: 400, message: 'スケッチ画像を送信してください' })
  const note = (body?.note ?? '').trim()
  const style = normalizeStyle(body?.style)

  const out = await callClaudeVision(anthropicApiKey as string, {
    system: SYSTEM,
    maxTokens: 1200,
    images: [sketch],
    text: `スタイル指定: ${style}（雰囲気: ${STYLE_HINT[style]}）
補足テキスト（顧客の要望。空なら無視）: ${note || '（なし）'}

次のスキーマの JSON のみを返してください:
{
  "category": "種別（日本語）",
  "width_mm": 数値 or null,
  "depth_mm": 数値 or null,
  "height_mm": 数値 or null,
  "shelves": 数値（棚段数。無ければ0） or null,
  "has_legs": true/false,
  "material": "材質の推定（日本語）",
  "prompt_en": "3D生成AI向けの英語プロンプト",
  "completions": ["AIが補った点（日本語）", "..."],
  "summary": "読み取り要約（日本語ひとこと）"
}`,
  })

  const parsed = parseJsonLoose<Interpretation>(out)
  if (!parsed) throw createError({ statusCode: 502, message: 'スケッチの読み取りに失敗しました。もう一度お試しください。' })

  return {
    category: parsed.category ?? '什器',
    width_mm: numOrNull(parsed.width_mm),
    depth_mm: numOrNull(parsed.depth_mm),
    height_mm: numOrNull(parsed.height_mm),
    shelves: numOrNull(parsed.shelves),
    has_legs: !!parsed.has_legs,
    material: parsed.material ?? '',
    prompt_en: parsed.prompt_en ?? '',
    completions: Array.isArray(parsed.completions) ? parsed.completions : [],
    summary: parsed.summary ?? '',
  } satisfies Interpretation
})

function numOrNull(v: unknown): number | null {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : null
}
