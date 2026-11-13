import { getSessionUser } from '~/server/utils/auth'
import { callClaudeText } from '~/server/utils/anthropic'
import { collectAllowedNumbers, findUnknownNumbers } from '~/utils/farm-simulator'

// 計算済みの見通し（数字）から、農家向けの説明文をAIに書かせる。
// AIは数字を作らない・思い出さない。渡した数字以外が文章に出たら、その文章は捨てる（1回だけ書き直させる）。
// 数字の計算はすべて画面側（utils/farm-simulator.ts）で済ませてあり、ここに来るのはその結果だけ。

const MODEL = 'claude-haiku-5-5'
const MAX_FACTS_BYTES = 12 * 1024

const SYSTEM = `あなたは和歌山県かつらぎ町の果樹農家に、収穫・出荷の見通しを説明する係です。
渡すのは、プログラムが計算し終えた数字だけです。それを読みやすい日本語にしてください。

【必ず守ること】
- 数字は、渡した事実に書いてある数字をそのまま使う。計算・言い換え・足し算・割合への換算・四捨五入をしない。
- 渡していない数字（パーセント、差、倍率、去年比など）を書かない。漢数字で量を書かない（「二割」など）。
- 気温・天気・市場について、渡した事実に無いことを思い出して書かない。
- 時期が早い・遅いの理由は「積算温度（暖かさの足し上げ）」の考え方だけで説明する。
- 天気を使っていない品目は、その理由をそのまま伝える。
- 断定しない（「〜の見込みです」「〜になりそうです」）。

【書き方】
- 品目ごとに1段落、2〜3文。最初に量の幅と山の時期、次に早い/遅いとその理由。
- 段落の頭に「【品目・種別】」を付ける。見出し・箇条書き・太字の記号は使わない。`

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{ facts?: unknown }>(event)
  const facts = Array.isArray(body?.facts) ? body.facts.slice(0, 6) : []
  if (!facts.length) throw createError({ statusCode: 400, message: '説明する見通しがありません' })
  const json = JSON.stringify(facts, null, 1)
  if (json.length > MAX_FACTS_BYTES) throw createError({ statusCode: 413, message: 'データが大きすぎます' })

  const allowed = collectAllowedNumbers(facts)
  let unknown: string[] = []
  for (let attempt = 0; attempt < 2; attempt++) {
    const retryNote = attempt
      ? `\n\n前回の文章には、渡していない数字（${unknown.join('、')}）が入っていました。渡した数字だけで書き直してください。`
      : ''
    const text = await callClaudeText(anthropicApiKey as string, {
      system: SYSTEM,
      model: MODEL,
      maxTokens: 900,
      messages: [{ role: 'user', content: `計算済みの事実（JSON）:\n${json}${retryNote}` }],
    })
    const cleaned = text.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim()
    unknown = findUnknownNumbers(cleaned, allowed)
    if (cleaned && !unknown.length) return { text: cleaned, rejected: false, unknown: [] as string[] }
    console.warn('[farm-simulator] explain rejected', unknown)
  }
  // 2回とも余計な数字が入った＝表示しない（何が入っていたかだけ返す）
  return { text: null, rejected: true, unknown }
})
