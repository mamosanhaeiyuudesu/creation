import type { H3Event } from 'h3'

export const getGeminiKey = (event?: H3Event): string => {
    const { geminiApiKey } = useRuntimeConfig(event)
    if (!geminiApiKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Gemini API key is not configured.',
        })
    }
    return geminiApiKey as string
}

// String.fromCharCode(...bytes) は引数が数万個になるとスタックを超えて落ちるため、
// 音声ファイル（数MB〜）でも安全なように分割して変換する（encrypt.ts の toBase64 と同じ方式）。
export const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = ''
    const CHUNK = 8192
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    return btoa(binary)
}
