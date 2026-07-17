// Fitbitダッシュボードの「今日のアドバイス」。当日+直近7日の主要メトリクスをテキスト化して
// Claudeに渡し、コーチカード風の見出し＋本文を生成する。1日を6時間刻み4スロット
// （0-6/6-12/12-18/18-24時, JST）に区切り、スロットごとに1本を継続スレッド（fitbit_chat_messages）へ
// 自動投稿する。同じスロットでは重複投稿せず既存を返す（＝6時間ごとに新しいアドバイスが増える）。

import type { H3Event } from 'h3'
import type { AdviceData, RawDay } from '~/types/fitbit'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { computeBaseline, computeSleepScore, computeEnergyScore } from '~/server/utils/fitbit-score'
import { findAdviceMessage, insertAdviceMessage, updateAdviceMessage } from '~/server/utils/fitbit-thread'
import { wrapApiError } from '~/server/utils/openai'
import { nowJST, todayJST, weekdayJa, fmtDuration } from '~/utils/jst'

/** 対象日の6時間スロット（0:0-6時, 1:6-12時, 2:12-18時, 3:18-24時, JST）。過去日は1日1本（-1固定）。 */
function slotFor(date: string): number {
  if (date !== todayJST()) return -1
  return Math.floor(nowJST().getUTCHours() / 6)
}

/**
 * 分析の時間帯。当日の午前はまだ歩数・運動が積み上がっていないため、活動系の指標は
 * 前日の値をメインに据え、その日の睡眠を主役にして語る（morning）。午後はその日の値を使う（afternoon）。
 */
type Phase = 'morning' | 'afternoon' | 'past'

function phaseFor(date: string): Phase {
  if (date !== todayJST()) return 'past'
  return nowJST().getUTCHours() < 12 ? 'morning' : 'afternoon'
}

/** "HH:MM" の集合から平均時刻を求める（正午より前は日付またぎとみなし+24hして平均） */
function avgTimeOfDay(times: string[]): string | null {
  const mins = times.filter(Boolean).map(t => {
    const [h, m] = t.split(':').map(Number)
    return (h < 12 ? h + 24 : h) * 60 + m
  })
  if (!mins.length) return null
  const avg = Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) % 1440
  return `${String(Math.floor(avg / 60)).padStart(2, '0')}:${String(avg % 60).padStart(2, '0')}`
}

const avgOf = (nums: number[]): number | null => {
  const valid = nums.filter(v => Number.isFinite(v) && v > 0)
  return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null
}

/** 1日分の活動系指標（心拍・活動量・運動）を行テキストにする */
function activityLines(day: RawDay): string[] {
  const lines = [
    `安静時心拍 ${day.restingHeartRate}bpm／心拍変動 ${day.hrv}ms`,
    `歩数 ${day.steps}歩／移動距離 ${day.distanceKm.toFixed(1)}km／消費カロリー ${day.caloriesKcal}kcal`,
  ]
  if (day.activities.length) {
    lines.push(`運動: ${day.activities.map(a => `${a.label} ${a.start}〜${a.end}（${a.durationMin}分・${a.caloriesKcal}kcal）`).join('、')}`)
  } else {
    lines.push('運動記録なし')
  }
  return lines
}

/**
 * 当日+直近7日から、AIに渡す事実の要約テキストを組み立てる（history は当日を末尾に含む古い順）。
 * 睡眠は常に対象日（その日の朝までの睡眠）のもの。活動系の指標は phase が morning のときだけ
 * 前日の確定値を渡す（対象日の午前中はまだ歩数・運動が積み上がっておらず、比較の意味が薄いため）。
 */
function buildFacts(history: RawDay[], phase: Phase): string {
  const today = history[history.length - 1]
  const yesterday = history[history.length - 2]
  const past = history.slice(0, -1)
  const baseline = computeBaseline(past.slice(-7))
  const sleepScore = computeSleepScore(today, baseline)
  const energyScore = computeEnergyScore(today, sleepScore, baseline, history.slice(-3))
  const asleepMin = today.sleep.totalMinutes - today.sleep.wakeMin

  const lines = [
    `対象日: ${today.date}（${weekdayJa(today.date)}曜）`,
    today.sleep.totalMinutes > 0
      ? `就寝 ${today.sleep.bedtime} → 起床 ${today.sleep.waketime}（睡眠合計 ${fmtDuration(today.sleep.totalMinutes)}、実質睡眠 ${fmtDuration(asleepMin)}、睡眠効率${today.sleep.efficiency}%、中途覚醒${today.sleep.awakeCount}回）`
      : '睡眠データなし',
    `睡眠スコア ${sleepScore.score ?? '不明'}（${sleepScore.label}）／エナジースコア ${energyScore.score ?? '不明'}（${energyScore.label}）`,
  ]

  if (phase === 'morning' && yesterday) {
    lines.push('', `【前日 ${yesterday.date}（${weekdayJa(yesterday.date)}曜）の活動】※対象日の午前中のため、活動系はこの前日の確定値を使うこと`)
    lines.push(...activityLines(yesterday))
  } else {
    lines.push(...activityLines(today))
  }

  const recent = past.slice(-7)
  // avgOf は整数に丸めるため、小数1桁を保ちたい移動距離は10倍して平均を取る
  const avgDistanceKm = avgOf(recent.map(d => d.distanceKm * 10))
  const baselineParts = [
    avgTimeOfDay(recent.map(d => d.sleep.bedtime)) ? `就寝 ${avgTimeOfDay(recent.map(d => d.sleep.bedtime))}` : null,
    avgOf(recent.map(d => d.sleep.totalMinutes)) ? `睡眠時間 ${fmtDuration(avgOf(recent.map(d => d.sleep.totalMinutes))!)}` : null,
    avgOf(recent.map(d => d.restingHeartRate)) ? `安静時心拍 ${avgOf(recent.map(d => d.restingHeartRate))}bpm` : null,
    avgOf(recent.map(d => d.hrv)) ? `心拍変動 ${avgOf(recent.map(d => d.hrv))}ms` : null,
    avgOf(recent.map(d => d.steps)) ? `歩数 ${avgOf(recent.map(d => d.steps))}歩` : null,
    avgDistanceKm ? `移動距離 ${(avgDistanceKm / 10).toFixed(1)}km` : null,
    avgOf(recent.map(d => d.caloriesKcal)) ? `消費カロリー ${avgOf(recent.map(d => d.caloriesKcal))}kcal` : null,
  ].filter((v): v is string => !!v)
  if (baselineParts.length) lines.push('', `直近7日間の平均（対象日を除く）: ${baselineParts.join('／')}`)

  return lines.join('\n')
}

/** 時間帯ごとの分析の軸（午前は前日の活動＋当日の睡眠、午後は当日の活動） */
const PHASE_RULES: Record<Phase, string> = {
  morning: `いまは午前です。今日はまだ始まったばかりなので、**その日の睡眠を主役**に、朝の状態と今日の過ごし方の見通しを描いてください。
- 活動系の指標（歩数・移動距離・消費カロリー・運動・安静時心拍・心拍変動）は当日分がまだ揃っていないため、入力の【前日の活動】の値だけを根拠にし、「昨日は〜」と前日の話だと分かるように書く
- 対象日の歩数・移動距離・消費カロリー・運動には触れない（まだ記録されていないため）`,
  afternoon: `いまは午後です。**その日の睡眠と、ここまでの当日の活動（運動・歩数・移動距離・消費カロリー）**を主役に読み解いてください。
- 当日の活動量は1日の途中までの集計である点を踏まえ、少なめでも不足と決めつけない`,
  past: `過去の日を振り返るアドバイスです。**その日の睡眠と運動（アクティビティ）**を主役に、1日を通しての様子を読み解いてください。`,
}

function systemPrompt(phase: Phase): string {
  return `あなたはFitbit Premiumのような健康コーチとして、ユーザーのその日の健康データを読み解くアドバイスカードを書きます。
入力としてその日の主要メトリクス（睡眠・スコア・心拍・活動量・運動）と、直近7日間の平均を渡します。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"headline":"見出し","body":"本文"}

${PHASE_RULES[phase]}

書き方:
- headline は20字前後。その日いちばん特徴的な事実を、親しみやすい語りかけで一言にする（例:「予定より1時間半も早い目覚めでしたね」）
- body は120〜180字程度、3〜4文。主役の指標は時間・スコア・効率・就寝起床、種目・時間・消費カロリーなどから具体的に描写する
- そのうえで、主役以外の指標（安静時心拍・心拍変動・歩数・移動距離・消費カロリー等）で直近7日間の平均と比べて**特筆すべき変化があれば1点だけ**添える（無ければ無理に触れない）
- 運動データが無い日は睡眠を主役にし、活動量（歩数）で補う
- 具体的な数値を複数交え、直近7日間の平均と比べて際立つ点は「いつもより〜」のように触れる（比較できる平均データが無い項目には触れない）
- 数値や重要な単語は **太字** で強調する（例: **6時間6分**）
- 指標は日本語の名称で呼び、英語の略語は使わない（HRV→心拍変動、REM→レム睡眠、SpO2→血中酸素、Deep sleep→深い睡眠）。単位（bpm・kcal・km・ms・%）はそのままでよい
- 温かく前向きな語り口（「〜ですね」「〜でしょう」等）。命令形は避け、自然に締める
- 文末を疑問文にしない（返信ボタンなどは無いため質問しても答えられない）
- 与えられたデータの範囲を超えて話を作らない（存在しない数値には触れない）
- JSON以外の文字列は一切出力しない`
}

async function callClaude(apiKey: string, facts: string, phase: Phase): Promise<AdviceData> {
  try {
    const raw = await callClaudeText(apiKey, {
      maxTokens: 700,
      system: systemPrompt(phase),
      messages: [{ role: 'user', content: facts }],
    })
    const parsed = parseJsonLoose<{ headline?: string; body?: string }>(raw) ?? {}
    const headline = String(parsed.headline ?? '').trim().slice(0, 60)
    const body = String(parsed.body ?? '').trim().slice(0, 360)
    if (!headline || !body) throw new Error('アドバイスの生成結果が空でした')
    return { headline, body }
  } catch (err) {
    return wrapApiError(err, 'アドバイスの生成に失敗しました')
  }
}

/**
 * 対象日・現在スロットのアドバイスを用意する（無ければ生成して継続スレッドへ投稿）。
 * history は対象日を末尾に含む古い順（当日+直近7日、ベースライン算出用）。
 * 同じ (対象日, 6時間スロット) では重複生成せず、既にスレッドにある内容を返す
 * （＝6時間ごとに新しいアドバイスがスレッドへ1本ずつ増えていく）。
 * refresh=true（更新ボタン）のときは既存を無視して作り直し、スレッド上の同スロットの
 * アドバイスを新しい内容へ差し替える（スレッドに同じ話が二重に積まれないようにする）。
 */
export async function generateAdvice(event: H3Event, userId: string, history: RawDay[], refresh = false): Promise<AdviceData> {
  const today = history[history.length - 1]
  const adviceSlot = `${today.date}#${slotFor(today.date)}`

  // 既にこのスロットのアドバイスがスレッドにあれば再利用（AIを呼ばない）
  if (!refresh) {
    const existing = await findAdviceMessage(event, userId, adviceSlot)
    if (existing) return { headline: existing.headline ?? '', body: existing.content }
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const phase = phaseFor(today.date)
  const advice = await callClaude(anthropicApiKey as string, buildFacts(history, phase), phase)

  // 更新時は既存の1本を差し替える（無ければ通常どおり投稿）
  if (refresh && await updateAdviceMessage(event, userId, adviceSlot, advice.headline, advice.body)) return advice

  // スレッドへ投稿（重複時は既存が返る）
  const saved = await insertAdviceMessage(event, userId, adviceSlot, advice.headline, advice.body)
  return { headline: saved.headline ?? advice.headline, body: saved.content }
}
