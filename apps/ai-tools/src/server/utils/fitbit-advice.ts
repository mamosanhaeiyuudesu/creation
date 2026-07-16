// Fitbitダッシュボードの「今日のアドバイス」。当日+直近7日の主要メトリクスをテキスト化して
// Claudeに渡し、コーチカード風の見出し＋本文を生成する。1日を6時間刻み4スロット
// （0-6/6-12/12-18/18-24時, JST）に区切り、スロットごとに1本を継続スレッド（fitbit_chat_messages）へ
// 自動投稿する。同じスロットでは重複投稿せず既存を返す（＝6時間ごとに新しいアドバイスが増える）。

import type { H3Event } from 'h3'
import type { AdviceData, RawDay } from '~/types/fitbit'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { computeBaseline, computeSleepScore, computeEnergyScore } from '~/server/utils/fitbit-score'
import { findAdviceMessage, insertAdviceMessage } from '~/server/utils/fitbit-thread'
import { wrapApiError } from '~/server/utils/openai'
import { nowJST, todayJST, weekdayJa, fmtDuration } from '~/utils/jst'

/** 対象日の6時間スロット（0:0-6時, 1:6-12時, 2:12-18時, 3:18-24時, JST）。過去日は1日1本（-1固定）。 */
function slotFor(date: string): number {
  if (date !== todayJST()) return -1
  return Math.floor(nowJST().getUTCHours() / 6)
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

/** 当日+直近7日から、AIに渡す事実の要約テキストを組み立てる（history は当日を末尾に含む古い順） */
function buildFacts(history: RawDay[]): string {
  const today = history[history.length - 1]
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
    `安静時心拍 ${today.restingHeartRate}bpm／HRV ${today.hrv}ms`,
    `歩数 ${today.steps}歩／消費カロリー ${today.caloriesKcal}kcal`,
  ]

  if (today.activities.length) {
    lines.push(`運動: ${today.activities.map(a => `${a.label} ${a.start}〜${a.end}（${a.durationMin}分・${a.caloriesKcal}kcal）`).join('、')}`)
  }

  const recent = past.slice(-7)
  const baselineParts = [
    avgTimeOfDay(recent.map(d => d.sleep.bedtime)) ? `就寝 ${avgTimeOfDay(recent.map(d => d.sleep.bedtime))}` : null,
    avgOf(recent.map(d => d.sleep.totalMinutes)) ? `睡眠時間 ${fmtDuration(avgOf(recent.map(d => d.sleep.totalMinutes))!)}` : null,
    avgOf(recent.map(d => d.restingHeartRate)) ? `安静時心拍 ${avgOf(recent.map(d => d.restingHeartRate))}bpm` : null,
    avgOf(recent.map(d => d.hrv)) ? `HRV ${avgOf(recent.map(d => d.hrv))}ms` : null,
    avgOf(recent.map(d => d.steps)) ? `歩数 ${avgOf(recent.map(d => d.steps))}歩` : null,
    avgOf(recent.map(d => d.caloriesKcal)) ? `消費カロリー ${avgOf(recent.map(d => d.caloriesKcal))}kcal` : null,
  ].filter((v): v is string => !!v)
  if (baselineParts.length) lines.push('', `直近7日間の平均（対象日を除く）: ${baselineParts.join('／')}`)

  return lines.join('\n')
}

const SYSTEM_PROMPT = `あなたはFitbit Premiumのような健康コーチとして、ユーザーのその日の健康データを読み解くアドバイスカードを書きます。
入力としてその日の主要メトリクス（睡眠・スコア・心拍・活動量・運動）と、直近7日間の平均を渡します。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"headline":"見出し","body":"本文"}

書き方:
- headline は20字前後。その日いちばん特徴的な事実を、親しみやすい語りかけで一言にする（例:「予定より1時間半も早い目覚めでしたね」）
- body は120〜180字程度、3〜4文。**睡眠と運動（アクティビティ）を主役**にして読み解く。睡眠は時間・スコア・効率・就寝起床などから、運動は種目・時間・消費カロリーなどから、その日の状態を具体的に描写する
- そのうえで、睡眠・運動以外の指標（安静時心拍・HRV・歩数・消費カロリー等）で直近7日間の平均と比べて**特筆すべき変化があれば1点だけ**添える（無ければ無理に触れない）
- 運動データが無い日は睡眠を主役にし、その日の活動量（歩数）で補う
- 具体的な数値を複数交え、直近7日間の平均と比べて際立つ点は「いつもより〜」のように触れる（比較できる平均データが無い項目には触れない）
- 数値や重要な単語は **太字** で強調する（例: **6時間6分**）
- 温かく前向きな語り口（「〜ですね」「〜でしょう」等）。命令形は避け、自然に締める
- 文末を疑問文にしない（返信ボタンなどは無いため質問しても答えられない）
- 与えられたデータの範囲を超えて話を作らない（存在しない数値には触れない）
- JSON以外の文字列は一切出力しない`

async function callClaude(apiKey: string, facts: string): Promise<AdviceData> {
  try {
    const raw = await callClaudeText(apiKey, {
      maxTokens: 700,
      system: SYSTEM_PROMPT,
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
 */
export async function generateAdvice(event: H3Event, userId: string, history: RawDay[]): Promise<AdviceData> {
  const today = history[history.length - 1]
  const adviceSlot = `${today.date}#${slotFor(today.date)}`

  // 既にこのスロットのアドバイスがスレッドにあれば再利用（AIを呼ばない）
  const existing = await findAdviceMessage(event, userId, adviceSlot)
  if (existing) return { headline: existing.headline ?? '', body: existing.content }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const advice = await callClaude(anthropicApiKey as string, buildFacts(history))

  // スレッドへ投稿（重複時は既存が返る）
  const saved = await insertAdviceMessage(event, userId, adviceSlot, advice.headline, advice.body)
  return { headline: saved.headline ?? advice.headline, body: saved.content }
}
