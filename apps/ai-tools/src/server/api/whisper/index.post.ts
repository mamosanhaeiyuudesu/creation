import type { H3Event } from 'h3'
import { appendLog, getOpenAiKey } from '~/server/utils/openai'
import { getGeminiKey, bytesToBase64 } from '~/server/utils/gemini'

type TranscriptionModel = 'whisper' | 'gemini'

const GEMINI_MODEL = 'gemini-2.5-flash'

export default defineEventHandler(async (event) => {
    try {
        const formData = await readFormData(event)
        const audioFile = formData.get('audio') as File

        if (!audioFile) {
            throw createError({
                statusCode: 400,
                statusMessage: 'audio file is required',
            })
        }

        const prompt = formData.get('prompt') as string | null
        const model = ((formData.get('model') as string | null) === 'gemini' ? 'gemini' : 'whisper') as TranscriptionModel

        const text = model === 'gemini'
            ? await transcribeWithGemini(event, audioFile, prompt)
            : await transcribeWithWhisper(event, audioFile, prompt)

        return { text }
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

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const body = await response.text()
        if (!body) return fallback
        try {
            const errorData = JSON.parse(body)
            return errorData.error?.message || fallback
        } catch {
            return body
        }
    } catch {
        return fallback
    }
}

async function transcribeWithWhisper(event: H3Event, audioFile: File, prompt: string | null): Promise<string> {
    const apiKey = getOpenAiKey(event)

    // OpenAI whisper APIへ送信
    const whisperFormData = new FormData()
    whisperFormData.append('file', audioFile)
    whisperFormData.append('model', 'whisper-1')
    whisperFormData.append('language', 'ja')
    whisperFormData.append('response_format', 'verbose_json')
    if (prompt) whisperFormData.append('prompt', prompt)

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
        },
        body: whisperFormData,
    })

    if (!response.ok) {
        const errorMessage = await readErrorMessage(response, `OpenAI API error: HTTP ${response.status}`)
        console.error('OpenAI API error:', errorMessage)
        throw createError({
            statusCode: response.status,
            statusMessage: errorMessage,
        })
    }

    let data: { text: string; duration?: number }
    try {
        data = await response.json()
    } catch {
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
    return data.text
}

async function transcribeWithGemini(event: H3Event, audioFile: File, prompt: string | null): Promise<string> {
    const apiKey = getGeminiKey(event)

    const arrayBuf = await audioFile.arrayBuffer()
    const base64Audio = bytesToBase64(new Uint8Array(arrayBuf))
    const mimeType = audioFile.type || 'audio/webm'

    const instruction = prompt
        ? `音声を一字一句そのまま日本語で文字起こししてください。説明・前置き・要約は不要で、書き起こし本文のみを返してください。参考情報（固有名詞など）: ${prompt}`
        : '音声を一字一句そのまま日本語で文字起こししてください。説明・前置き・要約は不要で、書き起こし本文のみを返してください。'

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { text: instruction },
                    { inline_data: { mime_type: mimeType, data: base64Audio } },
                ],
            }],
        }),
    })

    if (!response.ok) {
        const errorMessage = await readErrorMessage(response, `Gemini API error: HTTP ${response.status}`)
        console.error('Gemini API error:', errorMessage)
        throw createError({
            statusCode: response.status,
            statusMessage: errorMessage,
        })
    }

    let data: { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }
    try {
        data = await response.json()
    } catch {
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to parse Gemini response',
        })
    }

    if (import.meta.dev) {
        appendLog(event, `[Gemini] ${GEMINI_MODEL} | 音声文字起こし`)
    }
    return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
}
