// osarai の Claude 呼び出し（テーマ → 選択式の問題セット）を集約する。
// 出題の「匙加減」（レベルの読み取り方・正解が1つに定まる条件・解説の長さ）は全部ここのプロンプトにある。
//
// 生成は2段にしている:
//   1. 設計: テーマの言葉から対象レベルを読み取り、重ならない「出題する論点」を問題数ぶん決める（1回）
//   2. 作問: 論点を BATCH_SIZE 個ずつに分けて並列に問題文・選択肢・解説を書く
// 1回で30問を書かせると1分以上待たせるうえ、後半ほど前半と同じことを聞き直しがちになるため。
// 呼び出し数は 1 + ceil(30/5) = 7（書き直しが全部に起きても13）で、Workers の subrequest 上限（50）には十分遠い。

import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import type { OsaraiQuestion } from '~/types/osarai'

const BATCH_SIZE = 5

interface Plan {
  title: string
  level: string
  points: string[]
}

const PLAN_SYSTEM = `あなたは学び直しのためのドリルを設計する編集者です。
ユーザーが入力した「テーマ」だけを手がかりに、選択式問題の出題計画を立てます。

【レベルと範囲の読み取り】
- 難易度や対象者を選ぶ画面はありません。テーマの言葉そのものから読み取ってください。
  例:「肥料の基礎知識」→ 新規就農者でも解ける基礎。「桃の摘果の判断」→ 実務経験者向けの具体。
  「小学4年生の漢字」→ その学年で習う範囲。
- 読み取れない場合は「その分野を少しかじった大人が基礎を学び直す」水準にしてください。

【論点の決め方】
- 指定された数の論点を、互いに重ならないように選ぶこと（同じ知識を言い換えて2回聞かない）。
- 基礎の土台になる事柄を優先し、テーマ全体をまんべんなく覆うこと。
- 地域・品種・年によって答えが変わる事柄、法令の細かな数値など、正解が1つに定まりにくいものは選ばない。
- 各論点は「肥料の三要素のうちNが担う働き」のように、何を問うかが一文でわかる具体性で書く。

【テーマが問題を作れないものだった場合】
- 意味をなさない文字列、特定の個人についての詮索、危険な行為の手順などは出題しない。
  その場合は points を空配列にし、reject に理由を短く書くこと。

【出力形式】
JSONのみを出力すること。前置き・説明文・コードフェンスは付けない。
{
  "title": "画面に出す短い題（20字以内）",
  "level": "読み取った対象と水準を一言で（例: 新規就農者向けの基礎）",
  "points": ["論点1", "論点2"],
  "reject": ""
}`

const WRITE_SYSTEM = `あなたは学び直しのためのドリルの作問者です。
与えられた論点それぞれについて、4択の問題を1問ずつ作ります。

【問題の条件】
- 正解は必ず1つに定まること。専門家が見ても異論の出ない、確立した知識だけを問う。
  確信が持てない事実は出題せず、論点の範囲内で確実に言える事柄に寄せること。
- 条件によって答えが変わる事柄は、問題文に条件を書き込んで答えを1つにすること。
- 問題文は短く。スマホで一目で読める長さ（おおむね60字以内）にする。
- 問題文・選択肢・解説は日本語で書く（英単語を混ぜない。テーマが英語学習なら出題対象の英語だけは使ってよい）。
- 誤りの選択肢は、その分野を学び始めた人がつい選びそうな、もっともらしいものにする。
  同じ分野の別の知識（例: 窒素の働きを問うならリン酸・カリの働き）を誤りに使うのがよい。
  明らかにふざけた選択肢や、正解と同じ意味の言い換えは入れない。
- 【重要】知識が無くても形だけで正解が当てられる問題にしないこと。作問の最大の失敗はこれである。
  - 誤りの選択肢は候補として5つ書く（使う3つはこちらで選ぶ）。5つとも明確に誤りであること。
  - 正解だけが長く詳しいのが最も多い失敗である。これを防ぐため、正解を書いたらその文字数を数えて
    correct_len に書き、誤りの候補は5つとも「correct_len 〜 correct_len + 8 文字」で書く（正解より短くしない）。
    正解に2つの要素（「〜し、〜する」）を並べるなら、誤りの選択肢も同じく2つの要素を並べる。
  - 誤りの選択肢にだけ「必ず」「一切」「だけ」「すべて」のような極端な言い切りを入れない。
  - 「発火する」「数年かかる」のような、常識だけで外せる選択肢は入れない。
- 「すべて正しい」「いずれでもない」「上記のうち2つ」のような選択肢は使わない。
- 「正しくないものはどれか」形式は全体の2割までにし、使うときは問題文に明記する。

【解説】
- なぜそれが正解なのかを、学び直しに役立つ形で2〜3文（120字程度まで）で書く。
- 誤りの選択肢のうち紛らわしいものがあれば、どこが違うのかにも一言触れる。

【出力形式】
JSONのみを出力すること。前置き・説明文・コードフェンスは付けない。
論点と同じ順番・同じ数で questions を返すこと。
{
  "questions": [
    { "q": "問題文", "correct": "正解の選択肢", "correct_len": 正解の文字数, "wrong": ["誤り1", "誤り2", "誤り3", "誤り4", "誤り5"], "explanation": "解説" }
  ]
}`

async function planSet(apiKey: string, theme: string, count: number): Promise<Plan> {
  const out = await callClaudeText(apiKey, {
    system: PLAN_SYSTEM,
    maxTokens: 400 + count * 80,
    messages: [{ role: 'user', content: `テーマ: ${theme}\n問題数: ${count}` }],
  })
  const parsed = parseJsonLoose<Partial<Plan> & { reject?: string }>(out)
  if (!parsed) throw createError({ statusCode: 502, message: '問題の準備に失敗しました。もう一度お試しください。' })
  const points = Array.isArray(parsed.points)
    ? parsed.points.filter((p): p is string => typeof p === 'string' && p.trim() !== '').map((p) => p.trim())
    : []
  if (points.length === 0) {
    throw createError({
      statusCode: 422,
      message: parsed.reject?.trim() || 'このテーマでは問題を作れませんでした。言葉を変えてお試しください。',
    })
  }
  return {
    title: (parsed.title ?? '').toString().trim().slice(0, 40) || theme.slice(0, 40),
    level: (parsed.level ?? '').toString().trim().slice(0, 60),
    points: points.slice(0, count),
  }
}

interface RawQuestion {
  q?: unknown
  correct?: unknown
  wrong?: unknown
  explanation?: unknown
}

/**
 * 誤りの候補から、正解と文字数の近い3つを選ぶ。
 * AIに「選択肢の長さをそろえて」と指示するだけでは守られず、正解がいちばん長い問題が
 * 20問中16〜19問になった（実測。偶然なら5問程度）。長さだけで当てられるドリルは学び直しにならないので、
 * 候補を多めに書かせ、正解より長い候補が1つは入るようにこちらで選ぶ。
 */
function pickDistractors(correct: string, candidates: string[]): string[] {
  const len = correct.length
  const byCloseness = [...candidates].sort((a, b) => Math.abs(a.length - len) - Math.abs(b.length - len))
  const chosen = byCloseness.slice(0, 3)
  if (chosen.length === 3 && chosen.every((c) => c.length < len)) {
    const longer = byCloseness.find((c) => c.length >= len && !chosen.includes(c))
    if (longer) chosen[2] = longer
  }
  return chosen
}

/** 正解＋誤りの候補を受け取り、選択肢4つを並びをシャッフルして作る。形が崩れていたら null。 */
function shapeQuestion(raw: RawQuestion): OsaraiQuestion | null {
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const q = str(raw.q)
  const correct = str(raw.correct)
  const wrong = Array.isArray(raw.wrong) ? raw.wrong.map(str).filter((w) => w && w !== correct) : []
  const distractors = pickDistractors(correct, [...new Set(wrong)])
  if (!q || !correct || distractors.length < 3) return null

  // AIは正解を先頭や特定の位置に置きがちなので、並びはこちらで決める。
  const choices = [correct, ...distractors]
  const rand = crypto.getRandomValues(new Uint32Array(choices.length))
  for (let i = choices.length - 1; i > 0; i--) {
    const j = rand[i]! % (i + 1)
    ;[choices[i], choices[j]] = [choices[j]!, choices[i]!]
  }
  return { q, choices, answer: choices.indexOf(correct), explanation: str(raw.explanation) }
}

async function writeBatch(apiKey: string, theme: string, level: string, points: string[]): Promise<OsaraiQuestion[]> {
  const list = points.map((p, i) => `${i + 1}. ${p}`).join('\n')
  const out = await callClaudeText(apiKey, {
    system: WRITE_SYSTEM,
    maxTokens: 600 + points.length * 550,
    messages: [{ role: 'user', content: `テーマ: ${theme}\n対象と水準: ${level || '（指定なし）'}\n\n論点:\n${list}` }],
  })
  const parsed = parseJsonLoose<{ questions?: RawQuestion[] }>(out)
  const raws = Array.isArray(parsed?.questions) ? parsed!.questions : []
  return raws.map(shapeQuestion).filter((q): q is OsaraiQuestion => q !== null)
}

/**
 * 1バッチを書き、失敗したか問題数が足りなければ1度だけ書き直す。
 * JSONが崩れる・選択肢が足りない問題を落とす、で20問が15問になることがあった（実測）。
 * 書き直しても足りなければ多いほうを採る（問題数が少し欠けても、出題できるほうを優先する）。
 */
async function writeBatchWithRetry(apiKey: string, theme: string, level: string, points: string[]): Promise<OsaraiQuestion[]> {
  const first = await writeBatch(apiKey, theme, level, points).catch(() => [] as OsaraiQuestion[])
  if (first.length >= points.length) return first
  const second = await writeBatch(apiKey, theme, level, points).catch((e) => {
    if (first.length === 0) throw e
    return [] as OsaraiQuestion[]
  })
  return second.length > first.length ? second : first
}

export interface GeneratedSet {
  title: string
  level: string
  questions: OsaraiQuestion[]
}

export async function generateSet(apiKey: string, theme: string, count: number): Promise<GeneratedSet> {
  const plan = await planSet(apiKey, theme, count)

  const batches: string[][] = []
  for (let i = 0; i < plan.points.length; i += BATCH_SIZE) batches.push(plan.points.slice(i, i + BATCH_SIZE))

  // 一部のバッチが落ちても、残りで出題できるなら出す（全滅のときだけエラーにする）。
  const results = await Promise.allSettled(batches.map((b) => writeBatchWithRetry(apiKey, theme, plan.level, b)))
  const questions = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
  if (questions.length === 0) {
    const firstError = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined
    if (firstError) throw firstError.reason
    throw createError({ statusCode: 502, message: '問題の作成に失敗しました。もう一度お試しください。' })
  }
  return { title: plan.title, level: plan.level, questions }
}
