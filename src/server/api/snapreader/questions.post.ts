export default defineEventHandler(async (event) => {
    const body = await readBody<{ transcript?: string }>(event)
    const transcript = body?.transcript

    if (!transcript) {
        throw createError({ statusCode: 400, statusMessage: 'transcript is required' })
    }

    const apiKey = getOpenAiKey()
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
                                '以下の全文書き起こしを基に、次に聞くと良い質問を日本語で3つ作ってください。' +
                                '質問は各20文字程度のシンプルな日本語で、出力はJSON配列のみです。\n\n' +
                                transcript,
                        },
                    ],
                },
            ],
            max_output_tokens: 200,
        }, event, '質問候補生成')

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
