// Stage1: 音声ファイル → 文字起こし（OpenAI gpt-4o-transcribe）。
// 用語辞書の「正しい表記」を prompt に渡して固有名詞の認識精度を上げる。
// ここではまだ D1 にも Google にも何も書かない（文字起こしを返すだけ）。

import { getOpenAiKey } from '~/server/utils/openai'
import { requireKikigakiUser } from '~/server/utils/kikigaki'
import { glossaryPromptHint } from '~/utils/kikigaki-glossary'

const MODEL = 'gpt-4o-transcribe'
/**
 * OpenAI の音声APIの上限。長い会議はクライアント側の splitAndTranscribeBlob が
 * 20分ごと・8kHzモノラル（20分で約19MB）に分割してから送ってくるので、通常ここには当たらない。
 * 分割を経由しない呼び出しへの保険として残している。
 */
const MAX_BYTES = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  await requireKikigakiUser(event)

  const formData = await readFormData(event)
  const audio = formData.get('audio') as File | null
  if (!audio) throw createError({ statusCode: 400, message: '音声ファイルが指定されていません' })
  if (audio.size > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      message: `音声ファイルが大きすぎます（${(audio.size / 1024 / 1024).toFixed(1)}MB）。25MB以内に分割してからお試しください。`,
    })
  }
  // 分割された各チャンクは呼び出し側で順番に結合されるため、ここでは1つぶんだけを扱う。
  if (!audio.size) {
    throw createError({
      statusCode: 400,
      message: '音声ファイルが空です',
    })
  }

  const body = new FormData()
  body.append('file', audio)
  body.append('model', MODEL)
  body.append('language', 'ja')
  body.append('response_format', 'json')
  const hint = glossaryPromptHint()
  if (hint) body.append('prompt', hint)

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getOpenAiKey(event)}` },
    body,
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    let message = `文字起こしに失敗しました（HTTP ${response.status}）`
    try {
      message = JSON.parse(raw)?.error?.message || message
    } catch {
      if (raw) message = raw
    }
    console.error('[kikigaki/transcribe] OpenAI error:', message)
    throw createError({ statusCode: response.status, message })
  }

  const data = await response.json().catch(() => null)
  const text = (data?.text ?? '').trim()
  if (!text) throw createError({ statusCode: 502, message: '文字起こしの結果が空でした。録音を確認してください。' })

  return { text }
})
