export default defineEventHandler(async (event) => {
    const body = await readBody<{ imageBase64?: string }>(event)
    const imageBase64 = body?.imageBase64

    if (!imageBase64) {
        throw createError({ statusCode: 400, statusMessage: 'imageBase64 is required' })
    }

    const apiKey = getOpenAiKey()
    try {
        const data = await callOpenAi(apiKey, {
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
        })

        const transcript = extractText(data)
        if (!transcript) {
            throw createError({ statusCode: 502, statusMessage: '全文書き起こしを取得できませんでした。' })
        }

        return { transcript }
    } catch (err: any) {
        wrapApiError(err, '全文書き起こしに失敗しました。')
    }
})
