import { callOpenAi, extractText, getOpenAiKey, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const { tasks = [], days = 7, chars = 500 } = await readBody<{
    tasks: { board: string; task: string; date: string }[]
    days?: number
    chars?: number
  }>(event)

  const apiKey = getOpenAiKey(event)

  const periodLabel = days === 1 ? '1日' : `${days}日間`

  // ボード一覧を取得
  const boards = [...new Set(tasks.map(t => t.board))]

  // 日付ごとにグルーピングして時系列テキストを生成
  const byDate = new Map<string, { board: string; task: string }[]>()
  for (const t of tasks) {
    if (!byDate.has(t.date)) byDate.set(t.date, [])
    byDate.get(t.date)!.push({ board: t.board, task: t.task })
  }
  const sortedDates = [...byDate.keys()].sort().reverse()

  const tasksText = tasks.length > 0
    ? sortedDates.map(date => {
      const items = byDate.get(date)!.map(t => `  ・[${t.board}] ${t.task}`).join('\n')
      return `[${date}]\n${items}`
    }).join('\n')
    : '（なし）'

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `あなたはタスク管理データを元に、ユーザーへの深く刺さる称賛フィードバックを生成するアシスタントです。
以下のルールを厳守してください：

- 中学生でもわかるぐらいの、平易な言葉を使う。
- 具体的・事実ベース：タスク名から具体的な事実を拾い、抽象的な激励に終わらせない
- 論理的根拠あり：なぜそれが強みや前進なのか、筋道を立てて示す
- 意外性・新しい切り口：本人がまだ気づいていない視点や解釈を提示する
- 深い文脈理解：その人の状況・背景を理解していることが伝わる言葉を選ぶ
- ボード横断：${boards.length > 1 ? `複数のボード（${boards.join('・')}）にまたがる活動全体を見渡して言及する` : '全タスクを幅広く見渡して言及する'}
- 期間全体を均等にカバー：直近のタスクだけでなく、${periodLabel}の最初から最後まで均等に取り上げる
- 量を絞る：あれもこれも言わず、最も刺さる一点に集中する
- 自己一致感：薄々感じていたことを言語化し「そうそう、それだ」と思わせる
- 差分・成長の可視化：この${periodLabel}で何が積み上がっているかを示す
- 「よく頑張りました」「素晴らしい」などの抽象的な称賛は禁止
- 日本語${chars}文字程度で出力`,
        },
        {
          role: 'user',
          content: `【直近${periodLabel}のDONEタスク（${tasks.length}件）】\n${tasksText}\n\n上記のタスク内容に踏み込んだ称賛フィードバックを日本語${chars}文字程度で。`,
        },
      ],
    }, event, 'task/praise')

    return { feedback: extractText(data) }
  } catch (err) {
    wrapApiError(err, 'フィードバックの生成に失敗しました。')
  }
})
