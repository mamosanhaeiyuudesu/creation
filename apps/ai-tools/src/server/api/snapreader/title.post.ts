export default defineEventHandler(async (event) => {
    const body = await readBody<{ transcript?: string }>(event)
    const transcript = body?.transcript

    if (!transcript) {
        throw createError({ statusCode: 400, statusMessage: 'transcript is required' })
    }

    const apiKey = getOpenAiKey(event)
    try {
        const data = await callOpenAi(apiKey, {
            model: 'gpt-4.1-mini',
            input: [
                {
                    role: 'user',
                    content: `以下のテキストの内容を表す簡潔なタイトルを日本語で8文字以内で出力してください。タイトルのみ出力し、それ以外は何も出力しないこと。\n\n${transcript}`,
                },
            ],
            max_output_tokens: 20,
        }, event, 'タイトル生成')

        const title = extractText(data)
        return { title: title.trim().slice(0, 8) }
    } catch (err: any) {
        wrapApiError(err, 'タイトル生成に失敗しました。')
    }
})
