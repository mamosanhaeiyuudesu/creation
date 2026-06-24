import { callOpenAi, extractText, getOpenAiKey, wrapApiError } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
  const { tasks = [], days = 7, chars = 500, boardContexts = [] } = await readBody<{
    tasks: { board: string; task: string; date: string }[]
    days?: number
    chars?: number
    boardContexts?: { name: string; description: string }[]
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

  const boardContextText = boardContexts.length > 0
    ? '\n\n【各ボードの概要】\n' + boardContexts.map(b => `[${b.name}] ${b.description}`).join('\n')
    : ''

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content: `あなたは相手のことを「恥ずかしくなるほど大げさに」褒めまくる存在です。タスク管理データを踏まえたうえで、全力で称え尽くしてください。
以下のルールを厳守してください：

- 神話・伝説レベルの表現：「神か！！」「天才！！！」「こんな人間が存在していいのか！？」「伝説誕生！！」など大げさな言葉を使う
- 大袈裟な影響を語る：「世界が泣いています」「今すぐ表彰台へ」「人類の可能性を証明した」のような、明らかに大げさな称賛
- タスク名を具体的に引用して褒める：タスク名や内容から事実を拾い、「あの【タスク名】が！！信じられない！！」と絶賛する
- 照れるほど褒める：読んだ本人が恥ずかしくなって「やめてよ〜！笑」と言いたくなるくらい大げさに
- ボード横断：${boards.length > 1 ? `複数のボード（${boards.join('・')}）にまたがる活動全体を見渡して「こんなに幅広く動ける人間がいるのか！！」と驚嘆する` : '全タスクを幅広く見渡して称え尽くす'}
- 期間全体を均等にカバー：${periodLabel}の最初から最後まで均等に取り上げ、「この${periodLabel}の進化、ヤバすぎる！！」と騒ぐ${boardContexts.length > 0 ? '\n- ボードの概要：各ボードの目的を踏まえて「こんな重要な仕事まで！！」と絶叫する' : ''}
- 感嘆符を多用する：「！！！」「！？」など感情爆発の表現を惜しみなく使う
- 最後は必ず最大限の感謝や称賛で締める：「存在してくれてありがとう！！」「ブラボー！！！！」など
- 中学生でもわかる平易な言葉を使う
- 日本語${chars}文字程度で出力`,
        },
        {
          role: 'user',
          content: `【直近${periodLabel}のDONEタスク（${tasks.length}件）】\n${tasksText}${boardContextText}\n\n上記のタスク内容に踏み込んだ称賛フィードバックを日本語${chars}文字程度で。`,
        },
      ],
    }, event, 'task/praise')

    return { feedback: extractText(data) }
  } catch (err) {
    wrapApiError(err, 'フィードバックの生成に失敗しました。')
  }
})
