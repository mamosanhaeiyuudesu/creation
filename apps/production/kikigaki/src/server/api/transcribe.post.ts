// 音声 → 文字起こし（OpenAI gpt-4o-transcribe）。
//
// 長い会議はブラウザ側で10分ごと・16kHzモノラルWAVに分割されて、この口へ並列に届く
// （composables/useTranscribe.ts）。ここでは1つぶんだけを扱い、順番の結合は呼び出し側がやる。
//
// 利用者が登録した「よく出る名前」を prompt に渡して固有名詞の精度を上げる。
// prompt は本文に書き写されることがある（プロンプト漏れ）ので、結果は必ず cleanTranscript() を通す。

import { requireUser } from '~/server/utils/auth'
import { requireEntitlement } from '~/server/utils/entitlement'
import { getOpenAiKey } from '~/server/utils/openai'
import { loadGlossaryTerms } from '~/server/utils/glossary-store'
import { addUsage, requireTranscribeAllowance } from '~/server/utils/usage'
import { cleanTranscript } from '~/server/utils/transcript-clean'
import { glossaryEchoNeedles, glossaryPromptHint } from '~/utils/glossary'
import { chargeableSeconds } from '~/utils/audioLength'

const MODEL = 'gpt-4o-transcribe'
/**
 * OpenAI の音声APIの上限。長い会議はブラウザ側が10分ごとに分割してから送ってくるので通常は当たらない。
 * 分割を経由しない呼び出しへの保険。
 */
const MAX_BYTES = 25 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  // モニター期間中は無条件で通り、有料モードでは契約が無いと断る
  await requireEntitlement(event, user.id)
  await requireTranscribeAllowance(event, user.id)

  const formData = await readFormData(event)
  const audio = formData.get('audio') as File | null
  if (!audio) {
    throw createError({ statusCode: 400, message: '音声が受け取れませんでした。もう一度やり直してください。' })
  }
  if (!audio.size) {
    throw createError({
      statusCode: 400,
      message: '音声のファイルが空でした。録音し直すか、別のファイルをお選びください。',
    })
  }
  if (audio.size > MAX_BYTES) {
    throw createError({
      statusCode: 413,
      message: 'ファイルが大きすぎます。録音を分けてから、もう一度お試しください。',
    })
  }

  // 利用量として数える秒数。WAV ならヘッダーから正確に、圧縮音声なら申告値とサイズから求める
  const header = await audio.slice(0, 64).arrayBuffer()
  const seconds = chargeableSeconds({
    byteLength: audio.size,
    header,
    reportedSeconds: Number(formData.get('durationSec') ?? 0),
  })

  const terms = await loadGlossaryTerms(event, user.id)

  const body = new FormData()
  body.append('file', audio)
  body.append('model', MODEL)
  body.append('language', 'ja')
  body.append('response_format', 'json')
  const hint = glossaryPromptHint(terms)
  if (hint) body.append('prompt', hint)

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getOpenAiKey(event)}` },
    body,
  })

  if (!response.ok) {
    const raw = await response.text().catch(() => '')
    console.error('[kikigaki] transcribe error:', response.status, raw.slice(0, 500))
    throw createError({
      statusCode: 502,
      message: '文字起こしがうまくいきませんでした。少し時間をおいてから、もう一度お試しください。',
    })
  }

  // 失敗した回を利用量に数えると「使っていないのに減る」ので、成功してから足す
  await addUsage(event, user.id, { seconds })

  const data = await response.json().catch(() => null)
  const raw = (data?.text ?? '').trim()
  // 無音の幻覚・繰り返しループ・プロンプト漏れを落とす。全部落ちて空になったら「声が入っていない」
  const text = raw ? cleanTranscript(raw, glossaryEchoNeedles(terms)) : ''

  return { text }
})
