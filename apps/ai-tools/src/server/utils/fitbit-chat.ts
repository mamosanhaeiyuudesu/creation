// アクティビティ・チャット。ユーザーの直近の健康データ（睡眠・運動・活動量など）を
// 日別のテキスト表にまとめてClaudeに渡し、過去データを根拠に質問へ答える。
// 会話状態はクライアント側が保持し、毎回メッセージ列ごと送る（サーバーはステートレス）。

import type { RawDay, ChatMessage } from '~/types/fitbit'
import { computeBaseline, computeSleepScore } from '~/server/utils/fitbit-score'
import { wrapApiError } from '~/server/utils/openai'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function fmtDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return h > 0 ? `${h}時間${m}分` : `${m}分`
}

/** 1日分を1行のテキストにまとめる（baseline は当日より前の直近7日から算出済みを渡す） */
function dayLine(day: RawDay, baseline: ReturnType<typeof computeBaseline>): string {
  const weekday = WEEKDAYS[new Date(`${day.date}T00:00:00Z`).getUTCDay()]
  const parts: string[] = []

  if (day.sleep.totalMinutes > 0) {
    const asleep = day.sleep.totalMinutes - day.sleep.wakeMin
    const score = computeSleepScore(day, baseline)
    parts.push(
      `睡眠${fmtDuration(day.sleep.totalMinutes)}(実質${fmtDuration(asleep)}/効率${day.sleep.efficiency}%/中途覚醒${day.sleep.awakeCount}回/深い${day.sleep.deepMin}分・REM${day.sleep.remMin}分)`,
      `就寝${day.sleep.bedtime}→起床${day.sleep.waketime}`,
      `睡眠スコア${score.score ?? '不明'}`,
    )
  } else {
    parts.push('睡眠データなし')
  }

  parts.push(`歩数${day.steps}`, `消費${day.caloriesKcal}kcal`)
  if (day.restingHeartRate > 0) parts.push(`安静時心拍${day.restingHeartRate}bpm`)
  if (day.hrv > 0) parts.push(`HRV${day.hrv}ms`)

  if (day.activities.length) {
    parts.push(`運動: ${day.activities.map(a => `${a.label}${a.durationMin}分(${a.start}〜${a.end}・${a.caloriesKcal}kcal${a.distanceKm ? `・${a.distanceKm}km` : ''})`).join('、')}`)
  } else {
    parts.push('運動記録なし')
  }

  return `${day.date}(${weekday}) ${parts.join(' / ')}`
}

/** 直近履歴（古い順）を日別テキスト表にする。各日のスコアは当日より前の直近7日を基準に算出。 */
export function buildHistoryFacts(history: RawDay[]): string {
  return history
    .map((day, i) => dayLine(day, computeBaseline(history.slice(Math.max(0, i - 7), i))))
    .join('\n')
}

function systemPrompt(facts: string, days: number): string {
  return `あなたはユーザー専属の健康データアシスタントです。ユーザーのFitbit（Google Health）データをもとに、質問へ日本語で親しみやすく答えます。

以下は直近${days}日間のユーザーの健康データ（1行＝1日、新しい日ほど下）です:
${facts}

回答ルール:
- 必ず上記データのみを根拠にする。データに無いこと（この期間より前、測定していない指標）は「そのデータはありません」と正直に伝え、推測で数値を作らない
- 睡眠・運動（アクティビティ）に関する質問を得意とするが、歩数・心拍・HRV・消費カロリー等も扱える
- 「最近」「平均」「傾向」等を聞かれたら、上記データから自分で集計・比較して具体的な数値で答える
- 回答は2〜4文程度、簡潔に。重要な数値は **太字** で強調する
- 温かく前向きな語り口。ただし医療診断や断定的な健康判断はせず、必要なら「気になる場合は専門家に相談を」と添える`
}

/** チャットの1ターンに応答する。history は古い順の直近履歴。messages は会話全体（最後がユーザー発言）。 */
export async function answerChat(apiKey: string, history: RawDay[], messages: ChatMessage[]): Promise<string> {
  try {
    const trimmed = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
    if (!trimmed.length || trimmed[trimmed.length - 1].role !== 'user') {
      throw createError({ statusCode: 400, statusMessage: '質問が空です' })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 800,
        thinking: { type: 'disabled' },
        system: systemPrompt(buildHistoryFacts(history), history.length),
        messages: trimmed,
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。' })
    }
    const data = await response.json()
    const answer = (data?.content?.[0]?.text ?? '').trim()
    if (!answer) throw new Error('応答が空でした')
    return answer
  } catch (err) {
    return wrapApiError(err, 'チャットの応答生成に失敗しました')
  }
}
