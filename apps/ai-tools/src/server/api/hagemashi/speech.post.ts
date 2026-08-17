import { appendLog, getOpenAiKey, wrapApiError } from '~/server/utils/openai'

// はげまし文の読み上げ。OpenAI の音声合成（TTS）で mp3 を生成してそのまま返す。
const MODEL = 'gpt-4o-mini-tts'
const VOICE = 'coral' // 声を変えたいときはここだけ差し替える
const INSTRUCTIONS = '日本語で読み上げてください。相手に寄り添う温かいトーンで、落ち着いた自然な速さで、励ましの気持ちが伝わるように。'
const MAX_CHARS = 4000 // OpenAI TTS の入力上限（4096文字）に対する余裕

// マークダウン記法はそのまま読ませるとノイズになるので落とす
const stripMarkdown = (text: string): string =>
  text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*#{1,6}\s*/gm, '')
    .replace(/^\s*([-*_]\s*){3,}$/gm, '')       // 水平線
    .replace(/^\s*[-*+]\s+/gm, '')              // 箇条書き
    .replace(/^\s*>\s?/gm, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')  // リンク・画像
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

export default defineEventHandler(async (event) => {
  const body = await readBody<{ text: string }>(event)
  const text = stripMarkdown(body?.text ?? '').slice(0, MAX_CHARS)
  if (!text) {
    throw createError({ statusCode: 400, statusMessage: 'text is required' })
  }

  const apiKey = getOpenAiKey(event)

  try {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input: text,
        instructions: INSTRUCTIONS,
        response_format: 'mp3',
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw createError({
        statusCode: response.status,
        statusMessage: err?.error?.message || '読み上げ音声の生成に失敗しました',
      })
    }

    const audio = new Uint8Array(await response.arrayBuffer())

    if (import.meta.dev) {
      appendLog(event, `[OpenAI] ${MODEL} | speech | ${text.length}文字 → ${(audio.byteLength / 1024).toFixed(0)}KB`)
    }
    setResponseHeader(event, 'Content-Type', 'audio/mpeg')
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return audio
  } catch (err) {
    return wrapApiError(err, '読み上げ音声の生成に失敗しました')
  }
})
