import { callOpenAi, extractText, getOpenAiKey, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const { thisWeek } = await readBody<{ thisWeek: { board: string; task: string }[] }>(event)

  const apiKey = getOpenAiKey()

  const thisWeekText = thisWeek.length > 0
    ? thisWeek.map((t) => `・[${t.board}] ${t.task}`).join('\n')
    : '（なし）'

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `あなたはタスク管理データを元に、ユーザーへの深く刺さる称賛フィードバックを生成するアシスタントです。
以下のルールを厳守してください：

- 具体的・事実ベース：タスク名から具体的な事実を拾い、抽象的な激励に終わらせない
- 論理的根拠あり：なぜそれが強みや前進なのか、筋道を立てて示す
- 意外性・新しい切り口：本人がまだ気づいていない視点や解釈を提示する
- 深い文脈理解：その人の状況・背景を理解していることが伝わる言葉を選ぶ
- 量を絞る：あれもこれも言わず、最も刺さる一点に集中する
- 自己一致感：薄々感じていたことを言語化し「そうそう、それだ」と思わせる
- 差分・成長の可視化：この1週間で何が積み上がっているかを示す
- 「よく頑張りました」「素晴らしい」などの抽象的な称賛は禁止
- 日本語500文字程度で出力`,
        },
        {
          role: 'user',
          content: `【直近1週間のDONEタスク（${thisWeek.length}件）】\n${thisWeekText}\n\n上記のタスク内容に踏み込んだ称賛フィードバックを日本語500文字程度で。`,
        },
      ],
    }, event, 'task/praise')

    return { feedback: extractText(data) }
  } catch (err) {
    wrapApiError(err, 'フィードバックの生成に失敗しました。')
  }
})
