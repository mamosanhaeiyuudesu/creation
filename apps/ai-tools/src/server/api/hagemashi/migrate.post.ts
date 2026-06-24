import { getSessionUser } from '~/server/utils/auth'

function extractJson(raw: string): { sentiment: string; text: string } {
  const stripped = raw.replace(/```(?:json)?/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`no JSON object found in: ${stripped.slice(0, 80)}`)
  return JSON.parse(match[0])
}

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: '未ログイン' })

  const db = event.context.cloudflare?.env?.WHISPER_DB
  if (!db) throw createError({ statusCode: 503, message: 'データベースが利用できません' })

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'API keyが設定されていません' })

  const rows = await db
    .prepare("SELECT id, text, notes FROM app_history WHERE user_id = ? AND app = 'hagemashi'")
    .bind(user.id)
    .all<{ id: string; text: string; notes: string }>()

  const targets = (rows.results ?? []).filter(r => {
    if (!r.notes) return true
    try { const p = JSON.parse(r.notes); return !p.text } catch { return true }
  })

  let migrated = 0
  const errors: string[] = []

  for (const row of targets) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': anthropicApiKey as string,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: `以下の発話内容を分析し、JSONのみを返してください。
{
  "sentiment": "ポジ" または "ネガ",
  "text": "1〜2文の要約（何をした・何があったか＋気持ちを含む）"
}

ルール:
- sentiment は全体的にポジティブなら "ポジ"、ネガティブまたは辛い内容なら "ネガ"
- text は自然な日本語で1〜2文。前置きなし
- JSONのみ返す。余計な説明不要`,
          messages: [{ role: 'user', content: row.text || '（内容なし）' }],
        }),
      })

      if (!response.ok) {
        errors.push(`${row.id}: HTTP ${response.status}`)
        continue
      }

      const data = await response.json()
      const raw = data?.content?.[0]?.text ?? ''
      const parsed = extractJson(raw)
      const notes = JSON.stringify({ sentiment: parsed.sentiment ?? 'ポジ', text: parsed.text ?? '' })

      await db
        .prepare('UPDATE app_history SET notes = ? WHERE id = ? AND user_id = ?')
        .bind(notes, row.id, user.id)
        .run()

      migrated++
    } catch (e) {
      errors.push(`${row.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { migrated, skipped: targets.length - migrated, total: targets.length, errors }
})
