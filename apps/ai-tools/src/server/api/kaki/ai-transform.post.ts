import { requireAdmin } from '~/server/utils/kaki'
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'

// 農家の一次情報（専門用語を含む生の記録）を、里親が読んで愛着を持てる文章へ変換する。
// type ごとに出力先が異なる（観察メモ / 木の紹介文 / 病名）。
//
// 変換方針（設計書 4.3）:
//  - 農家を主語にしない。木を主語にする
//  - 欠点をネガティブに書かない。愛嬌として描く
//  - 専門用語は必ず言い換え、必要なら人間の病気や日常の出来事に例える
//  - 過度に感傷的にしない。事実ベースで温度がある文章

const SHARED_TONE = `あなたは柿の木の里親アプリで、農家の記録を里親（その木を見守る消費者）向けのやさしい文章に翻訳するライターです。
守ること:
- 農家を主語にしない。木そのものを主語・視点にする。
- 専門用語（病名・農作業用語）は必ず日常語に言い換える。必要なら人間の風邪や日常の出来事に例える。
- 欠点や不調をネガティブ・不安をあおる書き方にしない。その子の個性・愛嬌として描く。
- 過度に感傷的・詩的にしすぎない。事実ベースで、しかし温度のある文章にする。
- 絵文字や顔文字は使わない。`

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { anthropicApiKey } = useRuntimeConfig(event)
  if (!anthropicApiKey) throw createError({ statusCode: 500, message: 'Anthropic API key is not configured.' })

  const body = await readBody<{
    type?: 'observation' | 'personality' | 'health'
    rawNote?: string
    nickname?: string
    strengths?: string[]
    weaknesses?: string[]
    plantedYear?: number | null
    rawLabel?: string
  }>(event)

  const type = body?.type ?? 'observation'

  if (type === 'observation') {
    const raw = (body?.rawNote ?? '').trim()
    if (!raw) throw createError({ statusCode: 400, message: 'メモを入力してください' })
    const out = await callClaudeText(anthropicApiKey as string, {
      system: SHARED_TONE,
      maxTokens: 700,
      messages: [{
        role: 'user',
        content: `次の観察メモを2つの文章に変換し、JSONのみで返してください。
メモ: 「${raw}」

出力フォーマット（JSONのみ・前後に文章をつけない）:
{
  "aiStory": "里親向けのやさしい説明。180字程度。専門用語は言い換える。",
  "aiTreeVoice": "木の一人称の短いひとこと。40字程度。感情を込める。"
}`,
      }],
    })
    const parsed = parseJsonLoose<{ aiStory: string; aiTreeVoice: string }>(out)
    if (!parsed) throw createError({ statusCode: 502, message: 'AI変換に失敗しました' })
    return { aiStory: (parsed.aiStory ?? '').trim(), aiTreeVoice: (parsed.aiTreeVoice ?? '').trim() }
  }

  if (type === 'personality') {
    const nickname = (body?.nickname ?? 'この木').trim()
    const strengths = (body?.strengths ?? []).filter(Boolean)
    const weaknesses = (body?.weaknesses ?? []).filter(Boolean)
    const age = body?.plantedYear ? `${new Date().getFullYear() - body.plantedYear}歳` : '樹齢不明'
    const out = await callClaudeText(anthropicApiKey as string, {
      system: SHARED_TONE,
      maxTokens: 500,
      messages: [{
        role: 'user',
        content: `次の柿の木のキャラクター紹介文を書いてJSONのみで返してください。欠点こそ愛嬌として描いてください。
愛称: ${nickname}（${age}）
いいところ: ${strengths.length ? strengths.join('、') : '（未記入）'}
困ったところ: ${weaknesses.length ? weaknesses.join('、') : '（未記入）'}

出力フォーマット（JSONのみ）:
{ "personality": "150字程度の親しみやすい紹介文" }`,
      }],
    })
    const parsed = parseJsonLoose<{ personality: string }>(out)
    if (!parsed) throw createError({ statusCode: 502, message: 'AI変換に失敗しました' })
    return { personality: (parsed.personality ?? '').trim() }
  }

  // type === 'health'
  const rawLabel = (body?.rawLabel ?? '').trim()
  if (!rawLabel) throw createError({ statusCode: 400, message: '病名・できごとを入力してください' })
  const out = await callClaudeText(anthropicApiKey as string, {
    system: SHARED_TONE,
    maxTokens: 500,
    messages: [{
      role: 'user',
      content: `次の柿の木の病名・できごとを里親向けに変換し、JSONのみで返してください。
記述: 「${rawLabel}」

出力フォーマット（JSONのみ）:
{
  "aiLabel": "分かりやすい名称（例: 葉っぱが早く落ちる病気）",
  "aiDescription": "人間の病気や日常の出来事に例えた説明。100字程度。"
}`,
    }],
  })
  const parsed = parseJsonLoose<{ aiLabel: string; aiDescription: string }>(out)
  if (!parsed) throw createError({ statusCode: 502, message: 'AI変換に失敗しました' })
  return { aiLabel: (parsed.aiLabel ?? '').trim(), aiDescription: (parsed.aiDescription ?? '').trim() }
})
