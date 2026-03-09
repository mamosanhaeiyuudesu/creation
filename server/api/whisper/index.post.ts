export default defineEventHandler(async (event) => {
    const { openaiApiKey } = useRuntimeConfig()

    if (!openaiApiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'OPENAI_API_KEY is not configured',
        })
    }

    try {
        const formData = await readFormData(event)
        const audioFile = formData.get('audio') as File

        if (!audioFile) {
            throw createError({
                statusCode: 400,
                statusMessage: 'audio file is required',
            })
        }

        // OpenAI Whisper APIへ送信
        const whisperFormData = new FormData()
        whisperFormData.append('file', audioFile)
        whisperFormData.append('model', 'whisper-1')
        whisperFormData.append('language', 'ja')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openaiApiKey}`,
            },
            body: whisperFormData,
        })

        if (!response.ok) {
            const errorData = await response.json()
            console.error('OpenAI API error:', errorData)
            throw createError({
                statusCode: response.status,
                statusMessage: errorData.error?.message || 'Failed to transcribe audio',
            })
        }

        const data = await response.json()
        return {
            text: data.text,
        }
    } catch (error) {
        console.error('Transcription error:', error)
        if (error instanceof Error && 'statusCode' in error) {
            throw error
        }
        throw createError({
            statusCode: 500,
            statusMessage: error instanceof Error ? error.message : 'Internal server error',
        })
    }
})
