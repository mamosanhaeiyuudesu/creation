// 手動追加の運動記録。Google Health APIに載らない運動（剣道など）を、ユーザーが
// 項目名＋開始終了時刻で登録する。消費カロリーと絵文字アイコンはClaudeで推定する。
// 記録は fitbit_manual_activities（D1）に保存し、読み取り時に各日のactivitiesへ重ねる。

import type { H3Event } from 'h3'
import type { ActivitySession } from '~/types/fitbit'
import { getAppDb } from '~/server/utils/auth'
import { wrapApiError } from '~/server/utils/openai'

/** "HH:MM" → 0時からの経過分。不正なら null。 */
function toMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm?.trim() ?? '')
  if (!m) return null
  const h = Number(m[1]), mm = Number(m[2])
  if (h > 23 || mm > 59) return null
  return h * 60 + mm
}

/** 開始・終了から運動時間（分）を求める。終了が開始より前なら日跨ぎとみなし+24h。 */
export function durationMinutes(start: string, end: string): number | null {
  const s = toMinutes(start), e = toMinutes(end)
  if (s === null || e === null) return null
  let d = e - s
  if (d <= 0) d += 24 * 60
  return d
}

const SYSTEM_PROMPT = `あなたは運動の消費カロリーを推定する専門家です。運動の種目名と運動時間（分）が与えられます。
平均的な成人（体重約62kg）がその運動を行った場合の消費カロリー（active kcal）を、一般的なMETs値から推定してください。
また種目に合う絵文字アイコンを1つ選んでください（例: 剣道→🤺、ランニング→🏃、ヨガ→🧘、筋トレ→🏋️、水泳→🏊、サッカー→⚽、テニス→🎾、ダンス→💃、卓球→🏓、その他運動→🤸）。

必ず以下のJSON形式のみで返答してください（説明文やマークダウンは一切不要）:
{"caloriesKcal": 整数, "icon": "絵文字1つ"}`

/** 種目名＋運動時間から消費カロリーとアイコンをAI推定する。 */
export async function estimateManualActivity(apiKey: string, label: string, durationMin: number): Promise<{ caloriesKcal: number; icon: string }> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 120,
        thinking: { type: 'disabled' },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `種目: ${label}\n運動時間: ${durationMin}分` }],
      }),
    })
    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({ statusCode: response.status, statusMessage: err?.error?.message || 'カロリー推定に失敗しました。' })
    }
    const data = await response.json()
    const raw = (data?.content?.[0]?.text ?? '').trim()
    let parsed: { caloriesKcal?: number; icon?: string }
    try {
      parsed = JSON.parse(raw)
    } catch {
      const match = raw.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : {}
    }
    const kcal = Math.max(0, Math.round(Number(parsed.caloriesKcal) || 0))
    const icon = (String(parsed.icon ?? '').trim() || '🤸').slice(0, 4)
    return { caloriesKcal: kcal, icon }
  } catch (err) {
    return wrapApiError(err, 'カロリー推定に失敗しました')
  }
}

interface ManualRow {
  id: string; date: string; type: string; label: string; icon: string
  start: string; end: string; duration_min: number; calories_kcal: number; distance_km: number | null
}

const rowToSession = (r: ManualRow): ActivitySession => ({
  type: r.type, label: r.label, icon: r.icon, start: r.start, end: r.end,
  durationMin: r.duration_min, caloriesKcal: r.calories_kcal, distanceKm: r.distance_km ?? null,
  manual: true, id: r.id,
})

/** 期間内（start〜end, YYYY-MM-DD）の手動記録を日付→セッション配列で返す。 */
export async function listManualActivities(event: H3Event, userId: string, start: string, end: string): Promise<Map<string, ActivitySession[]>> {
  const map = new Map<string, ActivitySession[]>()
  const db = getAppDb(event)
  if (!db) return map
  const res = await db
    .prepare('SELECT * FROM fitbit_manual_activities WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY start')
    .bind(userId, start, end)
    .all()
    .catch(() => null)
  for (const row of (res?.results ?? []) as unknown as ManualRow[]) {
    const arr = map.get(row.date) ?? []
    arr.push(rowToSession(row))
    map.set(row.date, arr)
  }
  return map
}

/** 手動記録を1件保存して、保存後のセッションを返す。 */
export async function addManualActivity(
  event: H3Event, userId: string,
  rec: { date: string; label: string; icon: string; start: string; end: string; durationMin: number; caloriesKcal: number },
): Promise<ActivitySession> {
  const id = crypto.randomUUID()
  const db = getAppDb(event)
  if (db) {
    await db
      .prepare(`INSERT INTO fitbit_manual_activities
        (id, user_id, date, type, label, icon, start, end, duration_min, calories_kcal, distance_km, created_at)
        VALUES (?, ?, ?, 'MANUAL', ?, ?, ?, ?, ?, ?, NULL, ?)`)
      .bind(id, userId, rec.date, rec.label, rec.icon, rec.start, rec.end, rec.durationMin, rec.caloriesKcal, Math.floor(Date.now() / 1000))
      .run()
  }
  return {
    type: 'MANUAL', label: rec.label, icon: rec.icon, start: rec.start, end: rec.end,
    durationMin: rec.durationMin, caloriesKcal: rec.caloriesKcal, distanceKm: null, manual: true, id,
  }
}

/** 手動記録を削除する（本人のみ）。 */
export async function deleteManualActivity(event: H3Event, userId: string, id: string): Promise<void> {
  const db = getAppDb(event)
  if (!db) return
  await db.prepare('DELETE FROM fitbit_manual_activities WHERE id = ? AND user_id = ?').bind(id, userId).run()
}
