import { callOpenAi, extractText, getOpenAiKey, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const { thisWeek, lastMonthWeek } = await readBody<{ thisWeek: string[]; lastMonthWeek: string[] }>(event)

  const apiKey = getOpenAiKey()

  const thisWeekText = thisWeek.length > 0
    ? thisWeek.map((t) => `・${t}`).join('\n')
    : '（なし）'
  const lastMonthText = lastMonthWeek.length > 0
    ? lastMonthWeek.map((t) => `・${t}`).join('\n')
    : '（なし）'

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `あなたはタスク管理データを元に、ユーザーへの深く刺さる称賛フィードバックを生成するアシスタントです。
以下のルールを厳守してください：
- タスク名の文字列から「何をやった仕事か」を具体的に推測・解釈し、その内容に踏み込んで言及する
- 抽象的な称賛（「よく頑張りました」「素晴らしい」）は禁止。タスクの中身・種類・難易度感を読み取った上で褒める
- タスク名をそのまま引用するか、内容を噛み砕いた表現で具体性を出す
- 1ヶ月前との差分（件数・仕事の種類・取り組みの変化）を根拠にして言語化する
- 本人が薄々感じているが言語化できていないことを言語化する
- 2〜3文。各文は句点（。）で終える
- 日本語で出力`,
        },
        {
          role: 'user',
          content: `【直近1週間のDONEタスク（${thisWeek.length}件）】\n${thisWeekText}\n\n【2週間前の同じ1週間のDONEタスク（${lastMonthWeek.length}件）】\n${lastMonthText}\n\n上記を比較して、タスクの内容に踏み込んだ称賛フィードバックを2〜3文で。`,
        },
      ],
    }, event, 'task/praise')

    return { feedback: extractText(data) }
  } catch (err) {
    wrapApiError(err, 'フィードバックの生成に失敗しました。')
  }
})
