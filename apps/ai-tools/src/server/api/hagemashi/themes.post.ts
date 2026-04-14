import { getOpenAiKey, callOpenAi, extractText, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ texts: string[] }>(event)

  if (!body?.texts?.length) {
    throw createError({ statusCode: 400, statusMessage: 'texts are required' })
  }

  const apiKey = getOpenAiKey(event)

  const userContent = body.texts
    .slice(0, 10)
    .map((t, i) => `【記録${i + 1}】\n${t}`)
    .join('\n\n')

  const payload = {
    model: 'gpt-4o-mini',
    temperature: 0.8,
    instructions: `あなたはユーザーの音声記録を分析するアシスタントです。
以下の音声文字起こし記録を読み、このユーザーが深掘りすると成長に役立つと思われる**テーマや問い**を6〜8個抽出してください。

ルール：
- 各テーマ・質問は10〜20文字の簡潔な日本語フレーズ
- 哲学的・内省的な問いの形式が望ましい（例：「自分の強みとは？」「何が本当に大切か？」）
- JSONの配列形式で返す。例: ["テーマ1", "テーマ2", ...]
- マークダウンやコードブロックは使わず、純粋なJSON配列のみ返す`,
    input: userContent,
  }

  try {
    const data = await callOpenAi(apiKey, payload, event, 'テーマ生成')
    const raw = extractText(data).trim()
    let themes: string[] = []
    try {
      themes = JSON.parse(raw)
    } catch {
      // フォールバック：改行区切りで分割
      themes = raw.split('\n').map(s => s.replace(/^[-•*\d.]\s*/, '').replace(/[「」"]/g, '').trim()).filter(Boolean)
    }
    return { themes: themes.slice(0, 8) }
  } catch (err) {
    return wrapApiError(err, 'テーマ生成に失敗しました')
  }
})
