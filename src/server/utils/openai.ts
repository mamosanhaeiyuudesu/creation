import type { H3Event } from 'h3'

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

// USD per 1M tokens
const PRICING: Record<string, { input: number; output: number }> = {
    'gpt-4o':             { input: 2.50,  output: 10.00 },
    'gpt-4o-mini':        { input: 0.15,  output: 0.60  },
    'gpt-4.1':            { input: 2.00,  output: 8.00  },
    'gpt-4.1-mini':       { input: 0.40,  output: 1.60  },
    'gpt-4.1-nano':       { input: 0.10,  output: 0.40  },
}
const JPY_RATE = 150

export const appendLog = (event: H3Event | undefined, message: string) => {
    if (!event) {
        console.log(message)
        return
    }
    if (!event.context._apiLogs) event.context._apiLogs = []
    event.context._apiLogs.push(message)
    setResponseHeader(event, 'X-Api-Logs', encodeURIComponent(JSON.stringify(event.context._apiLogs)))
}

export const fetchOpenAi = async (apiKey: string, payload: Record<string, any>, event?: H3Event): Promise<Response> => {
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

export const callOpenAi = async (apiKey: string, payload: Record<string, any>, event?: H3Event, label?: string): Promise<any> => {
    const response = await fetchOpenAi(apiKey, payload, event)
    const data = await response.json().catch(() => null as any)

    if (!response.ok) {
        throw createError({
            statusCode: response.status || 500,
            statusMessage: data?.error?.message || 'OpenAI APIの呼び出しに失敗しました。',
        })
    }

    if (import.meta.dev) {
        const model = payload.model ?? '(unknown)'
        const price = PRICING[model]
        const usage = data?.usage
        if (price && usage) {
            const inputTokens = usage.input_tokens ?? 0
            const outputTokens = usage.output_tokens ?? 0
            const usd = (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output
            const jpy = usd * JPY_RATE
            const parts = [model, label, `¥${jpy.toFixed(4)} (${(usd * 100).toFixed(4)}¢)`].filter(Boolean)
            appendLog(event, `[OpenAI] ${parts.join(' | ')}`)
        } else {
            const parts = [model, label].filter(Boolean)
            appendLog(event, `[OpenAI] ${parts.join(' | ')}`)
        }
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
