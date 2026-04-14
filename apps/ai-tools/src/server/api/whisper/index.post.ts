import { appendLog, getOpenAiKey } from '~/server/utils/openai'

export default defineEventHandler(async (event) => {
    const apiKey = getOpenAiKey(event)

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
        whisperFormData.append('response_format', 'verbose_json')

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
            body: whisperFormData,
        })

        if (!response.ok) {
            let errorMessage = `OpenAI API error: HTTP ${response.status}`
            try {
                const body = await response.text()
                if (body) {
                    try {
                        const errorData = JSON.parse(body)
                        errorMessage = errorData.error?.message || errorMessage
                    } catch {
                        errorMessage = body
                    }
                }
            } catch {}
            console.error('OpenAI API error:', errorMessage)
            throw createError({
                statusCode: response.status,
                statusMessage: errorMessage,
            })
        }

        let data: { text: string; duration?: number }
        try {
            data = await response.json()
        } catch (parseErr) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to parse OpenAI response',
            })
        }
        if (import.meta.dev) {
            const JPY_RATE = 150
            const durationSec: number = data.duration ?? 0
            const usd = (durationSec / 60) * 0.006
            const jpy = usd * JPY_RATE
            appendLog(event, `[OpenAI] whisper-1 | 音声文字起こし | ¥${jpy.toFixed(4)} (${(usd * 100).toFixed(4)}¢)`)
        }
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
