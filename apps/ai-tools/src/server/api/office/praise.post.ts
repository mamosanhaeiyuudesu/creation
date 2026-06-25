export default defineEventHandler(async (event) => {
  const body = await readBody<{ checkLabel: string; checkedCount: number; totalCount: number }>(event)

  if (!body?.checkLabel) {
    throw createError({ statusCode: 400, statusMessage: 'checkLabel is required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const isShusshaCheck = body.checkLabel === '出社'
  const isKitakuCheck = body.checkLabel === '帰宅'
  const jikanMatch = body.checkLabel.match(/^(\d+)時間経過$/)

  const JSON_FORMAT = `以下のJSONのみ返してください:
{
  "title": "キャッチーな褒め言葉（15文字以内、！多め）",
  "message": "褒めメッセージ（2〜3文、大げさ・ユニーク・具体的に）"
}
JSONのみ。余計な説明不要。`

  let systemPrompt: string
  let context: string

  const HELL_PREMISE = '職場は地獄のようにしんどい場所という前提で、その過酷な環境を生き抜いていることを大げさに称えてください。'

  if (isShusshaCheck) {
    context = '地獄のような職場に今日も出勤した'
    systemPrompt = `${HELL_PREMISE}
「行きたくないのに来た」「それだけで十分すごい」という切り口で、出勤したこと自体を褒めてください。
毎回全く違うユニークな表現・切り口・テンションにしてください。
${JSON_FORMAT}`
  } else if (jikanMatch) {
    const hours = jikanMatch[1]
    context = `地獄のような職場で${hours}時間耐え続けた`
    systemPrompt = `${HELL_PREMISE}
「${hours}時間もあの場所に居続けた」忍耐力・精神力・生命力を称えてください。
毎回全く違うユニークな表現・切り口・テンションにしてください。
${JSON_FORMAT}`
  } else if (isKitakuCheck) {
    context = '地獄のような職場での1日を生き延びて帰宅した'
    systemPrompt = `${HELL_PREMISE}
「生き延びた」「脱出した」「今日も勝った」という切り口で、帰宅できたことを大げさに褒め称えてください。
毎回全く違うユニークな表現・切り口・テンションにしてください。
${JSON_FORMAT}`
  } else {
    context = `地獄のような職場で「${body.checkLabel}」を達成した`
    systemPrompt = `${HELL_PREMISE}
毎回全く違うユニークな表現・切り口・テンションにしてください。
${JSON_FORMAT}`
  }

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
      system: systemPrompt,
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
