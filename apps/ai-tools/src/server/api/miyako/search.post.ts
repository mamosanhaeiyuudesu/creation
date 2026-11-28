import { callOpenAi, getOpenAiKey, extractText, wrapApiError } from '../../utils/openai'
import { getAppDb } from '../../utils/auth'
import fileIds from '../../data/miyako-file-ids.json'

// "令和3年 第9回 定例会 2021-12-07〜2021-12-21" → "令和3年第9回定例会"
function normalizeKey(session: string): string {
  return session.replace(/\s/g, '').replace(/\d{4}-\d{2}-\d{2}.*/, '')
}

export default defineEventHandler(async (event) => {
  const { session, sessions, word, maxChars = 1000 } = await readBody<{
    session?: string
    sessions?: string[]
    word: string
    maxChars?: number
  }>(event)

  const apiKey = getOpenAiKey(event)
  const { miyakoVectorStoreId } = useRuntimeConfig(event)

  if (!miyakoVectorStoreId) {
    throw createError({ statusCode: 500, statusMessage: 'MIYAKO_VECTOR_STORE_ID が設定されていません。' })
  }

  // 単一セッションまたは複数セッションのキーを正規化
  const rawSessions = sessions ?? (session ? [session] : [])
  if (!rawSessions.length) {
    throw createError({ statusCode: 400, statusMessage: 'session または sessions が必要です。' })
  }

  // 最初の前処理で入れた会期は静的JSON、「直近の傾向」の cron が後から入れた会期は D1 にある
  const keys = rawSessions.map(normalizeKey)
  const known = new Set(keys.filter(k => (fileIds as Record<string, string>)[k]))
  const unknown = keys.filter(k => !known.has(k))
  const db = getAppDb(event)
  if (unknown.length && db) {
    try {
      const res = await db
        .prepare(`SELECT session_key FROM miyako_sessions WHERE file_id != '' AND session_key IN (${unknown.map(() => '?').join(',')})`)
        .bind(...unknown)
        .all()
      for (const r of res?.results ?? []) known.add(r.session_key)
    } catch {
      // テーブル未作成の環境では静的JSONの会期だけで続ける
    }
  }
  const normalizedKeys = keys.filter(k => known.has(k))

  if (!normalizedKeys.length) {
    throw createError({ statusCode: 404, statusMessage: '対象会期のファイルが見つかりません。' })
  }

  // OR フィルタ（1件なら eq、複数なら or）
  const sessionFilter = normalizedKeys.length === 1
    ? { type: 'eq', key: 'session', value: normalizedKeys[0] }
    : { type: 'or', filters: normalizedKeys.map(k => ({ type: 'eq', key: 'session', value: k })) }

  const isYearSearch = normalizedKeys.length > 1
  const contextLabel = isYearSearch
    ? `${normalizedKeys.length}件の会期にわたる議事録`
    : `「${normalizedKeys[0]}」の議事録`

  const logLabel = isYearSearch
    ? `miyako/search: ${normalizedKeys[0]}〜 (${normalizedKeys.length}件) / ${word}`
    : `miyako/search: ${normalizedKeys[0]} / ${word}`

  try {
    const data = await callOpenAi(apiKey, {
      model: 'gpt-4.1-mini',
      input: `${contextLabel}から「${word}」に関する議論を、議会に詳しくない一般市民でも理解できるよう以下のJSON形式のみで回答してください。前置き・説明文・マークダウン記法・JSONブロック以外のテキストは一切出力しないでください。

{"topics":[{"title":"15文字程度の見出し","body":"このまとまりの内容を書いた文章"}]}

まとめ方の条件（重要）：
- 議論の内容は、近いもの同士をまとめて、topics配列を2〜4件にする。質問者や場面ごとに細かく分けず、5件以上にしない
- 話題が1つしかないように見える場合も、論点で分けて2件にする。ただし議事録に無い内容は足さない
- titleは、その内容がひと目でわかる15文字程度の見出しにする
- 各topicのbodyには、発端、議論の展開、結論をひと続きの文章で書く。箇条書き、番号、小見出し、改行は使わず、文と文を自然につなげる
- 約${maxChars}文字は、全topicの合計の目安とする

文章の書き方の条件（重要）：
- 議会・行政の専門用語や略称（例：一般質問、答弁、附帯決議、補正予算、条例の号数など）はそのまま使わず、
  何の話かが一読でわかる普通の言葉に言い換えること。どうしても言い換えられない固有の制度名などは、
  初出時に簡単な説明を（）で補うこと
- 中学生が読んでも意味が通じる、平易でやわらかい文章にすること`,
      tools: [{
        type: 'file_search',
        vector_store_ids: [miyakoVectorStoreId],
        filters: sessionFilter,
      }],
    }, event, logLabel)

    const raw = extractText(data)
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw createError({ statusCode: 500, statusMessage: 'AI応答のJSON解析に失敗しました。' })
    const parsed = JSON.parse(jsonMatch[0])
    return { topics: parsed.topics as { title: string; body: string }[] }
  } catch (e: any) {
    wrapApiError(e, '議事録の検索に失敗しました。')
  }
})
