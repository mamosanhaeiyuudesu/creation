// farm-simulation の Claude 呼び出しを集約する（farm-manager-ai.ts と同じ方針）。
// ①確定申告書（青色申告決算書／収支内訳書の農業所得用）の読み取り ②前提条件の初期値の提案。
import { callClaudeText, claudeText, parseJsonLoose, thinkingOff } from '~/server/utils/anthropic'
import { EXPENSE_ITEMS, REVENUE_ITEMS } from '~/types/farm-simulation'
import type { TaxYear } from '~/types/farm-simulation'

const MESSAGES_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-5-5'

function catalog(): string {
  const rev = REVENUE_ITEMS.map((d) => `  ${d.key}\t${d.label}`).join('\n')
  const exp = EXPENSE_ITEMS.map((d) => `  ${d.key}\t${d.label}`).join('\n')
  return `【収入】\n${rev}\n\n【経費】\n${exp}`
}

const EXTRACT_SYSTEM = `あなたは農家の確定申告書を読む係です。青色申告決算書（農業所得用）または収支内訳書（農業所得用）の画像・PDFから、損益計算書の金額を正確に読み取ります。

【読み取りの方針】
- 対象の年（year）は「令和6年分」なら 2024 のように西暦で返す。読めなければ null。
- 金額は円単位の整数。空欄・0・読めない科目は 0 にし、読めなかった科目のキーは uncertain に入れる。
- 「収入」の販売金額・家事消費金額・雑収入をそれぞれ読む。農産物の棚卸高は読まない。
- 「経費」は印刷されている科目名と下の一覧のキーを対応させる。
  空欄の科目欄に手書き・印字で科目名を足してある場合は、その合計を otherExpense に入れ、科目名を warnings に書く。
- 専従者給与（familyWages）は経費の計の下にある別の欄。
- printed には決算書に印刷されている合計をそのまま入れる:
  revenueTotal＝収入の「小計」（販売金額＋家事消費＋雑収入。棚卸しを足す前の値）、
  expenseTotal＝経費の「計」（専従者給与は含まない）、
  income＝「青色申告特別控除前の所得金額」（収支内訳書なら「所得金額」）。読めなければ null。
- 数字が潰れている・桁が怪しい等、自信が持てない科目は uncertain にキーを入れ、warnings に日本語で理由を書く。
- 合計との突き合わせ（足し算・引き算）はアプリ側で正確に行うので、warnings に計算結果や「合計とずれている」は書かない。
  （モデルの暗算は桁を間違えやすく、合っている数字を「ずれている」と書いて農家を不安にさせたことがある）
- 損益計算書以外のページ（月別の売上・減価償却の明細など）は参考にしてよいが、金額は損益計算書の値を優先する。

必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

export interface ExtractResult {
  year: number | null
  form_type: string
  revenue: Record<string, number>
  expenses: Record<string, number>
  printed: { revenueTotal: number | null; expenseTotal: number | null; income: number | null }
  uncertain: string[]
  warnings: string[]
}

/** data URL を Messages API の image / document ブロックへ変換する。PDF は document で渡す。 */
function toBlock(dataUrl: string): Record<string, unknown> {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/)
  if (!m) throw createError({ statusCode: 400, message: 'ファイルのデータ形式が正しくありません' })
  const mediaType = m[1]!
  if (mediaType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mediaType, data: m[2] } }
  }
  return { type: 'image', source: { type: 'base64', media_type: mediaType, data: m[2] } }
}

export async function extractTaxReturn(apiKey: string, files: string[]): Promise<ExtractResult | null> {
  const response = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      thinking: thinkingOff(MODEL),
      system: `${EXTRACT_SYSTEM}\n\n【使えるキー（これ以外は返さない）】\n${catalog()}`,
      messages: [
        {
          role: 'user',
          content: [
            ...files.map(toBlock),
            {
              type: 'text',
              text: `次のスキーマの JSON のみを返してください:
{
  "year": 西暦の年 or null,
  "form_type": "青色申告決算書 / 収支内訳書 / 不明",
  "revenue": { "sales": 0, "homeUse": 0, "misc": 0 },
  "expenses": { "キー": 金額, ... },
  "printed": { "revenueTotal": 数値 or null, "expenseTotal": 数値 or null, "income": 数値 or null },
  "uncertain": ["自信が持てない科目のキー", "..."],
  "warnings": ["確認してほしい点", "..."]
}`,
            },
          ],
        },
      ],
    }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
  }
  return parseJsonLoose<ExtractResult>(claudeText(await response.json()).trim())
}

const SUGGEST_SYSTEM = `あなたは日本の農業経営に詳しいアドバイザーです。農家の確定申告の実績から、今後10年の経営シミュレーションに使う前提条件の「たたき台」を出します。

- 出すのは4つの年率（%/年）: 売上の伸び revenueRate／資材費の上昇率 materialRate／人件費の変化 laborRate／その他の経費の上昇率 otherRate。
- 農家が自分で数字をいじる前の初期値なので、極端な値は避け、ありそうな中くらいの値にする。小数第1位まで。
- 資材費は肥料・農薬・燃料・段ボールなどの生産資材の価格動向（農業物価指数など）を踏まえる。
- 売上は、複数年の実績があればその傾向を見る。1年しかなければ「去年と同じ（0%）」を基本にする。
- 人件費は最低賃金の引き上げを踏まえる。雇人費が0なら 0 にする。
- reasons にはそれぞれの理由を、農家に話しかけるやさしい言葉で40字以内で書く。断定しない。

必ず JSON のみを返す。前後に説明文やコードブロックの記号を付けない。`

export interface SuggestResult {
  revenueRate: number
  materialRate: number
  laborRate: number
  otherRate: number
  reasons: { revenue: string; material: string; labor: string; other: string }
}

export async function suggestAssumptions(apiKey: string, years: TaxYear[]): Promise<SuggestResult | null> {
  const lines = years
    .sort((a, b) => a.year - b.year)
    .map((y) => {
      const rev = REVENUE_ITEMS.map((d) => `${d.label} ${y.revenue[d.key] ?? 0}`).join('、')
      const exp = EXPENSE_ITEMS.filter((d) => (y.expenses[d.key] ?? 0) !== 0)
        .map((d) => `${d.label} ${y.expenses[d.key]}`)
        .join('、')
      return `${y.year}年: 収入（${rev}） 経費（${exp || 'なし'}）`
    })
    .join('\n')
  const out = await callClaudeText(apiKey, {
    system: SUGGEST_SYSTEM,
    maxTokens: 800,
    model: MODEL,
    messages: [
      {
        role: 'user',
        content: `確定申告の実績（円）:\n${lines}\n\n次のスキーマの JSON のみを返してください:
{ "revenueRate": 数値, "materialRate": 数値, "laborRate": 数値, "otherRate": 数値,
  "reasons": { "revenue": "理由", "material": "理由", "labor": "理由", "other": "理由" } }`,
      },
    ],
  })
  return parseJsonLoose<SuggestResult>(out)
}
