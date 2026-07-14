// Fitbitダッシュボードの「今日のアドバイス」カード。
// 当日+直近7日の主要メトリクスをテキスト化してClaudeに渡し、Fitbit Premiumのコーチカード風の
// 見出し＋本文を生成する。同じ日・同じデータ（signature一致）ならAIを呼ばずD1キャッシュを再利用する
// （hagemashi/topic-summary.post.ts と同じ方式）。

import type { H3Event } from 'h3'
import type { AdviceData, RawDay } from '~/types/fitbit'
import { getAppDb } from '~/server/utils/auth'
import { computeBaseline, computeSleepScore, computeEnergyScore } from '~/server/utils/fitbit-score'
import { wrapApiError } from '~/server/utils/openai'

// プロンプト仕様の版数。プロンプトを変えたらここを上げると既存キャッシュが無効化され再生成される。
const PROMPT_VERSION = 'v1'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

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

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

/** 当日+直近7日から、AIに渡す事実の要約テキストを組み立てる（history は当日を末尾に含む古い順） */
function buildFacts(history: RawDay[]): string {
  const today = history[history.length - 1]
  const past = history.slice(0, -1)
  const baseline = computeBaseline(past.slice(-7))
  const sleepScore = computeSleepScore(today, baseline)
  const energyScore = computeEnergyScore(today, sleepScore, baseline, history.slice(-3))
  const asleepMin = today.sleep.totalMinutes - today.sleep.wakeMin
  const weekday = WEEKDAYS[new Date(`${today.date}T00:00:00Z`).getUTCDay()]

  const lines = [
    `対象日: ${today.date}（${weekday}曜）`,
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

function signatureOf(facts: string): string {
  const canonical = PROMPT_VERSION + facts
  let h = 5381
  for (let i = 0; i < canonical.length; i++) h = (h * 33) ^ canonical.charCodeAt(i)
  return `${(h >>> 0).toString(36)}.${canonical.length}`
}

const SYSTEM_PROMPT = `あなたはFitbit Premiumのような健康コーチとして、ユーザーのその日の健康データを一言で言い当てるアドバイスカードを書きます。
入力としてその日の主要メトリクス（睡眠・スコア・心拍・活動量）と、直近7日間の平均を渡します。

必ず以下のJSON形式のみで返答してください（マークダウンコードブロックや説明文は一切不要）:
{"headline":"見出し","body":"本文"}

書き方:
- headline は20字前後。その日いちばん特徴的な事実を、親しみやすい語りかけで一言にする（例:「予定より1時間半も早い目覚めでしたね」）
- body は120〜200字程度、改行なしの2〜3文
- 具体的な数値を交えつつ、直近7日間の平均と比較して「いつもより〜」のように語る（比較できる平均データが無い項目には触れない）
- 数値や重要な単語は **太字** で強調する（例: **6時間6分**、**56**）
- 温かく前向きな語り口（「〜ですね」「〜でしょう」等）。命令形は避け、軽い提案で自然に締める
- 文末を疑問文にしない（返信ボタンなどは無いため質問しても答えられない）
- 与えられたデータの範囲を超えて話を作らない（存在しない数値には触れない）
- JSON以外の文字列は一切出力しない`

async function callClaude(apiKey: string, facts: string): Promise<AdviceData> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 300,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: facts }],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }
    const data = await response.json()
    const raw = (data?.content?.[0]?.text ?? '').trim()
    let parsed: { headline?: string; body?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : {}
    }
    const headline = String(parsed.headline ?? '').trim().slice(0, 60)
    const body = String(parsed.body ?? '').trim().slice(0, 400)
    if (!headline || !body) throw new Error('アドバイスの生成結果が空でした')
    return { headline, body }
  } catch (err) {
    return wrapApiError(err, 'アドバイスの生成に失敗しました')
  }
}

/**
 * 対象日分のアドバイスカードを生成する。
 * history は対象日を末尾に含む古い順（当日+直近7日、ベースライン算出用）。
 * ログイン中はD1にsignature付きでキャッシュし、同一データなら再生成しない。
 */
export async function generateAdvice(event: H3Event, userId: string, history: RawDay[]): Promise<AdviceData> {
  const today = history[history.length - 1]
  const facts = buildFacts(history)
  const signature = signatureOf(facts)

  const db = getAppDb(event)
  if (db) {
    const cached = await db
      .prepare('SELECT signature, headline, body FROM fitbit_advice WHERE user_id = ? AND date = ?')
      .bind(userId, today.date)
      .first()
      .catch(() => null) as { signature: string; headline: string; body: string } | null
    if (cached && cached.signature === signature) {
      return { headline: cached.headline, body: cached.body }
    }
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })

  const advice = await callClaude(anthropicApiKey as string, facts)

  if (db) {
    await db
      .prepare('INSERT OR REPLACE INTO fitbit_advice (user_id, date, signature, headline, body, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(userId, today.date, signature, advice.headline, advice.body, new Date().toISOString())
      .run()
      .catch(() => { /* キャッシュ保存の失敗は無視して結果は返す */ })
  }

  return advice
}
