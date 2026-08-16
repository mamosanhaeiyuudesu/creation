import { callClaudeText } from '~/server/utils/anthropic'

/**
 * 指定期間（既定は該当日の週＝月〜日）のDONEタスクから「時間の使い方」の振り返りを生成する。
 *
 * 何を見るか：どのボードにどれだけ時間（工数）を使ったか。
 * ボードの性質は名前・概要からAIに読み取らせる。その軸（お金に近い／ミッションに近い／投資／運用）は
 * REVIEW_AXES に集約しているので、フィードバックの方針を変えたいときはここだけ触ればよい。
 */

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function withWeekday(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return `${dateStr}(${WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]})`
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** 時間の性質を見る軸。ここがフィードバックの匙加減そのもの。 */
const REVIEW_AXES = `- お金に近い時間：営業・マーケティング・受注業務など、売上や現金に直接つながる時間。
  短期の生存を支える。ここがゼロになると事業が続かない。
- ミッションに近い時間：「AI×人間」のように、何のためにやっているのかそのものに関わる時間。
  すぐ売上にはならないが、ここが痩せると事業をやる理由が薄れる。
- 投資の時間：学習・仕組み化・基盤づくり・試作など、将来のリターンのために今払うコスト。
  効果が出るまで時間差があるぶん、忙しい週に真っ先に削られやすい。
- 運用・維持の時間：回し続けるために必要だが、増やしても価値が増えにくい時間。`

export default defineEventHandler(async (event) => {
  const {
    start = '',
    end = '',
    chars = 1000,
    boards = [],
    tasks = [],
  } = await readBody<{
    start?: string
    end?: string
    chars?: number
    boards?: { name: string; desc?: string; hours: number; count: number }[]
    tasks?: { board: string; task: string; date: string; effort: number }[]
  }>(event)

  const periodLabel = `${withWeekday(start)} 〜 ${withWeekday(end)}`
  const totalHours = boards.reduce((s, b) => s + (b.hours || 0), 0)
  const totalCount = boards.reduce((s, b) => s + (b.count || 0), 0)

  // ボード別の時間（多い順）。0時間のボードも「使えなかった」という事実なので落とさない。
  const boardLines = [...boards]
    .sort((a, b) => (b.hours || 0) - (a.hours || 0))
    .map((b) => {
      const share = totalHours > 0 ? Math.round(((b.hours || 0) / totalHours) * 100) : 0
      const desc = b.desc ? ` — ${b.desc.replace(/\s+/g, ' ').slice(0, 200)}` : ''
      return `[${b.name}] ${round1(b.hours || 0)}時間（${share}%）・${b.count || 0}件${desc}`
    })
    .join('\n')

  // 日別の合計時間
  const byDate = new Map<string, { board: string; task: string; effort: number }[]>()
  for (const t of tasks) {
    if (!byDate.has(t.date)) byDate.set(t.date, [])
    byDate.get(t.date)!.push({ board: t.board, task: t.task, effort: t.effort })
  }
  const sortedDates = [...byDate.keys()].sort()

  const dailyLines = sortedDates
    .map((date) => {
      const hours = byDate.get(date)!.reduce((s, t) => s + (t.effort || 0), 0)
      return `${withWeekday(date)} ${round1(hours)}時間`
    })
    .join('\n')

  const taskLines = sortedDates.length > 0
    ? sortedDates
      .map((date) => {
        const items = byDate.get(date)!.map((t) => `  ・[${t.board}] ${t.task}（${round1(t.effort || 0)}h）`).join('\n')
        return `[${withWeekday(date)}]\n${items}`
      })
      .join('\n')
    : '（なし）'

  if (import.meta.dev) {
    const top = [...boards].sort((a, b) => (b.hours || 0) - (a.hours || 0))[0]
    return {
      feedback: `【サンプルデータ】
■ 時間の使い方
${periodLabel}に完了したタスクは${totalCount}件、合計${round1(totalHours)}時間でした。もっとも時間を使ったのは「${top?.name ?? '（なし）'}」で${round1(top?.hours ?? 0)}時間です。
${boardLines || '（ボードのデータがありません）'}

■ 気づき
売上に近い仕事に時間が寄っている週だったと読めます。目の前の現金を作る動きが取れているのは強みですが、ミッションに近い仕事と、将来のための投資の時間が細っていないかは見ておきたいところです。

■ 次の週へ
まずは投資の時間を週2時間だけ先に確保して、残りを営業に充てる形を試してみてください。`,
    }
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const system = `あなたはタスク管理データをもとに「時間の使い方」を一緒に振り返る伴走者です。
褒めることも励ますことも目的ではありません。どのボードにどれだけ時間を使ったかという事実を示し、
その配分が何を意味するのかを本人が考えられるようにするのが役割です。

【時間の性質を見る軸】
渡されたボードが、名前と概要から次のどれに近いかを読み取ってください（1つに決めきれないボードは複数にまたがると書いてよい）。
${REVIEW_AXES}

【書き方のルール】
- まず事実から入る：どのボードに何時間・全体の何%使ったかを具体的な数字で書く
- ボードの性質を上の軸で読み解く。ただし決めつけず「〜に近いと読めます」のように書く
- 偏りを一方的に「悪い」と断じない。お金に寄っていればミッションと投資が細っていないかを、
  ミッションや投資に寄っていればお金の時間が足りているかを問う。
  どちらも「今はこの配分でよい局面」であり得る、という前提で書く
- 投資の時間はゼロでも今週は困らないが、続くと後で効いてくる、という時間差の性質に触れる
- 具体的なタスク名を引用し、抽象論で終わらせない
- ほとんど時間を使えなかったボードがあれば、それも事実として拾う（責めない）
- 最後は次の週の配分について、実行できる具体的な提案を1〜2個
- 中学生でもわかる平易な言葉を使う。感嘆符は使わない

【出力の形】
次の3つの見出しを、この文字のまま行頭に書いて3部構成にすること。
■ 時間の使い方
■ 気づき
■ 次の週へ

全体で日本語${chars}文字程度。`

  const userText = `【期間】${periodLabel}
【完了タスク】${totalCount}件 / 合計 ${round1(totalHours)}時間

【ボード別の時間】
${boardLines || '（ボードがありません）'}

【日別の合計時間】
${dailyLines || '（完了タスクがありません）'}

【完了タスクの一覧】
${taskLines}

上記をもとに、この期間の時間の使い方の振り返りを日本語${chars}文字程度で。`

  return {
    feedback: await callClaudeText(anthropicApiKey as string, {
      system,
      messages: [{ role: 'user', content: userText }],
      maxTokens: Math.min(8000, Math.max(1500, chars * 3)),
    }),
  }
})
