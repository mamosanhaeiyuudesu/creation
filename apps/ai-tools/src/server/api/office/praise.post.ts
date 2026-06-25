export default defineEventHandler(async (event) => {
  const body = await readBody<{ checkLabel: string; checkedCount: number; totalCount: number }>(event)

  if (!body?.checkLabel) {
    throw createError({ statusCode: 400, statusMessage: 'checkLabel is required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const isComplete = body.checkedCount === body.totalCount
  const context = isComplete
    ? `全${body.totalCount}個のチェックをコンプリートした（「${body.checkLabel}」が最後のチェック）`
    : `${body.totalCount}個中${body.checkedCount}個目のチェック「${body.checkLabel}」を達成した`

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
      system: `勤怠管理アプリでチェックを達成したユーザーを大げさに褒めてください。
毎回全く違うユニークな表現・切り口・テンションにしてください。
以下のJSONのみ返してください:
{
  "title": "キャッチーな褒め言葉（15文字以内、！多め）",
  "message": "褒めメッセージ（2〜3文、大げさ・ユニーク・具体的に）"
}
JSONのみ。余計な説明不要。`,
      messages: [{
        role: 'user',
        content: context,
      }],
    }),
  })

  if (!response.ok) {
    throw createError({ statusCode: response.status, statusMessage: 'AI APIの呼び出しに失敗しました' })
  }

  const data = await response.json()
  const raw = data?.content?.[0]?.text ?? ''
  const stripped = raw.replace(/```(?:json)?/g, '').trim()
  const match = stripped.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(match ? match[0] : stripped)

  return { title: parsed.title ?? 'すごい！！', message: parsed.message ?? 'よくできました！！' }
})
