import { requirePaletteUser, requirePaletteDb, ensurePaletteVideoTables } from '~/server/utils/palette'
import { getOpenAiKey } from '~/server/utils/openai'
import { isVoice } from '~/utils/palette-video'
import { PALETTE_VIDEO_LIMITS } from '~/types/palette'

// シーンの読み上げ。OpenAI の音声合成（TTS）で mp3 を作る（hagemashi の読み上げと同じモデル）。
// videoId があれば D1（palette_video_audio）に保存して { id } を返す。無ければ声の試聴用に mp3 をそのまま返す（保存しない）。
const MODEL = 'gpt-4o-mini-tts'
const INSTRUCTIONS = '日本語のナレーションです。落ち着いた、聞き取りやすい自然な速さで、短い動画の語りとして読み上げてください。'
const SAMPLE = 'こんにちは。この声で、記事を読み上げます。'

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const STEP = 0x8000 // String.fromCharCode に一度に渡せる数には上限があるので分けて渡す
  for (let i = 0; i < bytes.length; i += STEP) bin += String.fromCharCode(...bytes.subarray(i, i + STEP))
  return btoa(bin)
}

export default defineEventHandler(async (event) => {
  const user = await requirePaletteUser(event)
  const body = await readBody<{ text?: string; voice?: string; videoId?: string }>(event)
  const voice = isVoice(body?.voice) ? body!.voice : 'coral'
  const videoId = String(body?.videoId ?? '').slice(0, 64)
  const text = videoId ? String(body?.text ?? '').trim() : SAMPLE
  if (!text) throw createError({ statusCode: 400, message: '読み上げる文が空です' })
  if (text.length > PALETTE_VIDEO_LIMITS.narrationChars) {
    throw createError({ statusCode: 400, message: `読み上げは1シーン${PALETTE_VIDEO_LIMITS.narrationChars}字までです` })
  }

  let db: any = null
  if (videoId) {
    db = requirePaletteDb(event)
    await ensurePaletteVideoTables(db)
    const own = await db.prepare('SELECT id FROM palette_videos WHERE id = ? AND user_id = ?').bind(videoId, user.id).first()
    if (!own) throw createError({ statusCode: 404, message: '動画が見つかりません' })
  }

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getOpenAiKey(event)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, voice, input: text, instructions: INSTRUCTIONS, response_format: 'mp3' }),
  })
  if (!res.ok) {
    const err: any = await res.json().catch(() => null)
    throw createError({ statusCode: res.status === 429 ? 429 : 502, message: err?.error?.message || `読み上げ音声を作れませんでした（${res.status}）` })
  }
  const audio = new Uint8Array(await res.arrayBuffer())

  if (!videoId) {
    setResponseHeader(event, 'Content-Type', 'audio/mpeg')
    setResponseHeader(event, 'Cache-Control', 'no-store')
    return audio
  }
  const id = crypto.randomUUID()
  await db
    .prepare('INSERT INTO palette_video_audio (id, user_id, video_id, data) VALUES (?, ?, ?, ?)')
    .bind(id, user.id, videoId, toBase64(audio))
    .run()
  return { id }
})
