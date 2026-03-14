type ChatMessage = {
    role: 'user' | 'assistant'
    content: string
}

export default defineEventHandler(async (event) => {
    const body = await readBody<{ summary?: string; messages?: ChatMessage[] }>(event)
    const summary = body?.summary
    const rawMessages = body?.messages ?? []

    if (!summary) {
        throw createError({ statusCode: 400, statusMessage: 'summary is required' })
    }

    const messages = Array.isArray(rawMessages)
        ? rawMessages.filter(
            (m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
        )
        : []

    const historyText = messages
        .map((m) => `${m.role === 'user' ? 'ユーザー' : 'アシスタント'}: ${m.content}`)
        .join('\n')

    const apiKey = getOpenAiKey()
    try {
        const input: any[] = [
            {
                role: 'system',
                content: [
                    {
                        type: 'input_text',
                        text:
                            'あなたは画像要約を深掘りする質問を提案するアシスタントです。' +
                            '次に聞くと良い質問を日本語で3つ提案してください。' +
                            '出力はJSON配列のみで、番号や箇条書きは不要です。',
                    },
                ],
            },
            {
                role: 'user',
                content: [{ type: 'input_text', text: `要約:\n${summary}` }],
            },
        ]

        if (historyText) {
            input.push({
                role: 'user',
                content: [{ type: 'input_text', text: `これまでの会話:\n${historyText}` }],
            })
        }

        const data = await callOpenAi(apiKey, { model: 'gpt-4.1', input, max_output_tokens: 200 })
        const text = extractText(data)
        const questions = parseQuestions(text).map(normalizeQuestion).filter(Boolean).slice(0, 3)

        if (questions.length === 0) {
            throw createError({ statusCode: 502, statusMessage: '質問候補を取得できませんでした。' })
        }

        return { questions }
    } catch (err: any) {
        wrapApiError(err, '質問候補の取得に失敗しました。')
    }
})
