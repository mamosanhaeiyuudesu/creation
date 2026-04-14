export default defineEventHandler(async (event) => {
    const body = await readBody<{ transcript?: string }>(event)
    const transcript = body?.transcript

    if (!transcript) {
        throw createError({ statusCode: 400, statusMessage: 'transcript is required' })
    }

    const apiKey = getOpenAiKey(event)
    try {
        const data = await callOpenAi(apiKey, {
            model: 'gpt-4.1',
            input: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'input_text',
                            text:
                                '以下の全文書き起こしを基に、日本語で要約してください。' +
                                'マークダウンは使わず、句点「。」ごとに改行してください。\n\n' +
                                transcript,
                        },
                    ],
                },
            ],
            max_output_tokens: 800,
        }, event, '要約')

        const summary = extractText(data)
        if (!summary) {
            throw createError({ statusCode: 502, statusMessage: '要約を取得できませんでした。' })
        }

        return { summary }
    } catch (err: any) {
        wrapApiError(err, '要約に失敗しました。')
    }
})
