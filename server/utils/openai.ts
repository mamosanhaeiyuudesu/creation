export const getOpenAiKey = (): string => {
    const { openaiApiKey } = useRuntimeConfig()
    if (!openaiApiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'OpenAI API key is not configured.',
        })
    }
    return openaiApiKey as string
}

export const fetchOpenAi = async (apiKey: string, payload: Record<string, any>): Promise<Response> => {
    const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    })

    if (response.status === 429) {
        throw createError({
            statusCode: 429,
            statusMessage: '時間を置いて再試行してください。',
        })
    }

    return response
}

export const callOpenAi = async (apiKey: string, payload: Record<string, any>): Promise<any> => {
    const response = await fetchOpenAi(apiKey, payload)
    const data = await response.json().catch(() => null as any)

    if (!response.ok) {
        throw createError({
            statusCode: response.status || 500,
            statusMessage: data?.error?.message || 'OpenAI APIの呼び出しに失敗しました。',
        })
    }

    return data
}

export const extractText = (data: any): string =>
    data?.output_text ||
    data?.output?.[0]?.content?.find?.((chunk: any) => 'text' in chunk)?.text ||
    ''

export const wrapApiError = (err: any, fallbackMessage: string): never => {
    if (err?.statusCode && err?.statusMessage) throw err
    throw createError({
        statusCode: 500,
        statusMessage: err?.message || fallbackMessage,
    })
}
