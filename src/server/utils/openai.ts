import type { H3Event } from 'h3'

interface OpenAiContentPart {
  type: string
  text?: string
  image_url?: string
}

interface OpenAiMessage {
  role: string
  content: string | OpenAiContentPart[]
}

export interface OpenAiPayload {
  model: string
  input: OpenAiMessage[]
  max_output_tokens?: number
  tools?: unknown[]
  tool_choice?: unknown
  temperature?: number
}

interface OpenAiResponse {
  output_text?: string
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>
  usage?: { input_tokens: number; output_tokens: number }
  error?: { message: string }
}

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

export const fetchOpenAi = async (apiKey: string, payload: OpenAiPayload, event?: H3Event): Promise<Response> => {
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

export const callOpenAi = async (apiKey: string, payload: OpenAiPayload, event?: H3Event, label?: string): Promise<OpenAiResponse> => {
    const response = await fetchOpenAi(apiKey, payload, event)
    const data: OpenAiResponse = await response.json().catch(() => null)

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

export const extractText = (data: OpenAiResponse): string => {
    if (data?.output_text) return data.output_text
    // ツール使用時は output 配列に file_search_call が先行し、message は後方にある
    const messageItem = data?.output?.find((item) => item.type === 'message')
    if (messageItem) {
        const chunk = messageItem.content?.find((c) => c.type === 'output_text' || 'text' in c)
        if (chunk?.text) return chunk.text
    }
    return ''
}

export const wrapApiError = (err: unknown, fallbackMessage: string): never => {
    if (err && typeof err === 'object' && 'statusCode' in err && 'statusMessage' in err) throw err
    throw createError({
        statusCode: 500,
        statusMessage: err instanceof Error ? err.message : fallbackMessage,
    })
}
