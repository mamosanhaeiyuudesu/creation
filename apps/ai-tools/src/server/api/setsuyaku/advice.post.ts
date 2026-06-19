import { wrapApiError } from '~/server/utils/openai'

interface GamanRecord {
  id: string
  date: string
  name: string
  price: number
  reason: string
  tags: string[]
}

export default defineEventHandler(async (event) => {
  const body = await readBody<{ wants: string; wantTags: string[]; records: GamanRecord[] }>(event)

  if (!body?.wants?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'wants is required' })
  }

  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) {
    throw createError({ statusCode: 500, statusMessage: 'Anthropic API key is not configured.' })
  }

  const records = body.records ?? []
  const recordsContext = records.length
    ? records
        .map(r => `- 【${r.date}】${r.name}（¥${r.price.toLocaleString()}）　理由: ${r.reason}　タグ: ${r.tags.join(', ')}`)
        .join('\n')
    : '（該当する我慢ログなし）'

  const tagNote = body.wantTags?.length
    ? `参照タグ: ${body.wantTags.join(', ')}`
    : '（タグ絞り込みなし・全件参照）'

  const systemPrompt = `あなたは節約アドバイザーです。ユーザーが過去に買うのを我慢したものの記録を参考に、今欲しいものを買うべきかどうかについて率直かつ温かくアドバイスしてください。
過去の記録からパターンを見つけ、具体的な根拠を示してください。記録がない場合は一般的なアドバイスを行ってください。
日本語で200〜350文字程度で返してください。`

  const userContent = `【欲しいもの・理由】\n${body.wants}

【${tagNote}】
${recordsContext}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey as string,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userContent }],
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({
        statusCode: response.status,
        statusMessage: err?.error?.message || 'Claude APIの呼び出しに失敗しました。',
      })
    }

    const data = await response.json()
    const text = data?.content?.[0]?.text ?? ''
    return { result: text }
  } catch (err) {
    return wrapApiError(err, 'アドバイスの生成に失敗しました')
  }
})
