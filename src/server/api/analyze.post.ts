const CACHE_TTL_MS = 60 * 60 * 72 * 1000 // 72時間
const cache = new Map<string, { summary: string; transcript: string; questions: string[]; expiresAt: number }>()

const hashString = (value: string) => {
    let hash = 2166136261
    for (let i = 0; i < value.length; i++) {
        hash ^= value.charCodeAt(i)
        hash = Math.imul(hash, 16777619)
    }
    return `${(hash >>> 0).toString(16)}-${value.length}`
}

const tryParse = (text: string) => {
    try {
        return JSON.parse(text)
    } catch {
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) return null
        try {
            return JSON.parse(match[0])
        } catch {
            return null
        }
    }
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{ imageBase64?: string }>(event)
    const imageBase64 = body?.imageBase64

    if (!imageBase64) {
        throw createError({ statusCode: 400, statusMessage: 'imageBase64 is required' })
    }

    const apiKey = getOpenAiKey()
    try {
        const cacheKey = hashString(imageBase64)
        const cached = cache.get(cacheKey)
        const now = Date.now()

        if (cached && cached.expiresAt > now) {
            setHeader(event, 'X-Cache', 'HIT')
            return { summary: cached.summary, transcript: cached.transcript, questions: cached.questions }
        }
        if (cached) cache.delete(cacheKey)

        const transcriptData = await callOpenAi(apiKey, {
            model: 'gpt-4.1',
            input: [
                {
                    role: 'user',
                    content: [
                        { type: 'input_text', text: '画像内の文章を日本語で全文書き起こししてください。' },
                        { type: 'input_image', image_url: imageBase64 },
                    ],
                },
            ],
            max_output_tokens: 3000,
        }, event, '全文書き起こし')

        const transcript = extractText(transcriptData)
        if (!transcript) {
            throw createError({ statusCode: 502, statusMessage: '全文書き起こしを取得できませんでした。' })
        }

        const summaryData = await callOpenAi(apiKey, {
            model: 'gpt-4.1',
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text:
                                '以下の全文書き起こしを基に、日本語で要約と質問案を作成してください。' +
                                '出力は必ずJSONのみで返し、次の形式にしてください。' +
                                '{"summary":"要約","questions":["質問1","質問2","質問3"]}。' +
                                '質問は各20文字程度のシンプルな日本語にしてください。\n\n' +
                                transcript,
                        },
                    ],
                },
            ],
            max_output_tokens: 1200,
        }, event, '要約・質問生成')

        const summaryContent = extractText(summaryData)
        const parsed = tryParse(summaryContent)
        const summary = typeof parsed?.summary === 'string' ? parsed.summary : ''
        const questions = Array.isArray(parsed?.questions) ? parsed.questions.map((q: any) => String(q)) : []

        if (!summary) {
            throw createError({ statusCode: 502, statusMessage: '解析結果を取得できませんでした。' })
        }

        cache.set(cacheKey, { summary, transcript, questions, expiresAt: now + CACHE_TTL_MS })
        return { summary, transcript, questions }
    } catch (err: any) {
        wrapApiError(err, '画像の解析に失敗しました。')
    }
})
