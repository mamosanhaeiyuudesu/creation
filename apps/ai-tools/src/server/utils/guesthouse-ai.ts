// ゲストハウス案内アプリ (guesthouse) フェーズ2・3 の Claude 呼び出しを集約する。
// 相談の下書き・お客さん日記・お礼/レビュー依頼・傾向抽出。すべて「下書き」で、人が確認して使う前提。
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { buildKnowledgeBase } from '~/server/utils/guesthouse'
import type { DiaryContent, Diary, ExtractedTip, FarewellDraft, House, ThreadMessage, Tip, TipExtractResult, TrendItem } from '~/types/guesthouse'

/** 会話を読みやすいテキスト起こしにする（プロンプト用）。 */
export function threadTranscript(messages: ThreadMessage[]): string {
  const label: Record<string, string> = { guest: 'お客様', auto: '自動応答', host: '阪中さん' }
  return messages.map((m) => `${label[m.role] ?? m.role}: ${m.content}`).join('\n')
}

/**
 * 心のこもった相談への「阪中さんの返信」下書きを作る（承認後に阪中さん名義で送られる）。
 * おすすめ素材(tip)と会話を踏まえて、その人の旅程に合わせた提案にする（フェーズ3）。
 */
export async function draftConsultReply(
  apiKey: string,
  house: House,
  tips: string,
  messages: ThreadMessage[],
  question: string
): Promise<string> {
  const system = `あなたは、ゲストハウスのホスト「阪中さん」が、お客様の心のこもった相談（観光・食事・旅程に合わせた提案など）に返信するための下書きを作るアシスタントです。この下書きは阪中さんが確認・修正してから、阪中さん本人の名義で送られます。

# 書き方
- 阪中さん本人が書いたような、あたたかく自然な一人称の文章にする。畑仕事の合間に返すような、飾らない親しみのある口調。
- お客様が使った言語で書く（日本語なら日本語、英語なら英語）。
- その人の旅程・状況（会話から読み取る）に合わせて具体的に提案する。
- 下記「おすすめ素材」に書かれた宿ならではの情報があれば優先して活かす。
- 【重要】素材に無いことを、事実であるかのように断定しない。分からないことは正直に「調べてみますね」等にとどめ、作り話をしない。
- 3〜6文程度。長すぎない。

# 宿の情報
${buildKnowledgeBase(house)}

# おすすめ素材（宿ならではの提案の種。無ければ一般的な範囲で控えめに）
${tips || '（登録なし）'}

返信本文だけを出力する（前置き・見出し・引用符は不要）。`

  const text = await callClaudeText(apiKey, {
    system,
    maxTokens: 700,
    messages: [
      {
        role: 'user',
        content: `これまでの会話:\n"""\n${threadTranscript(messages)}\n"""\n\nお客様の相談: ${question}\n\nこの相談への阪中さんの返信下書きを書いてください。`,
      },
    ],
  })
  return text.trim()
}

/** 会話からお客さん日記の下書きを生成（旅程・国籍・印象・気づき＋ひとこと要約）。 */
export async function generateDiary(
  apiKey: string,
  house: House,
  messages: ThreadMessage[],
  guestName: string
): Promise<{ content: DiaryContent; summary: string }> {
  const system = `あなたは、ゲストハウスのホスト「阪中さん」のリサーチノート「お客さん日記」の下書きを作るアシスタントです。お客様との会話から、次のお客様への提案や宿の運営に活きる気づきを整理します。

次の JSON のみを返す（前後に説明やコードブロック記号を付けない）:
{
  "nationality": "国籍・出身（会話から分かれば。不明なら空文字）",
  "itinerary": "旅程（どこから来て、次にどこへ行くか等。分かる範囲で）",
  "highlights": "この滞在で印象的だったこと・お客様が喜んだこと",
  "notes": "阪中さんの気づき／次のお客様や宿づくりへの活かし方",
  "summary": "ひとことの要約（日本語・30字程度）"
}

# 方針
- 会話に書かれていないことは想像で埋めない。分からない欄は空文字にする。
- 個人が特定される連絡先などは書かない（旅の傾向や好みなど、運営に活きる情報に絞る）。
- 日本語で書く。`

  const out = await callClaudeText(apiKey, {
    system,
    maxTokens: 900,
    messages: [
      {
        role: 'user',
        content: `宿: ${house.name}\nお客様の呼び名: ${guestName || '（不明）'}\n\n会話:\n"""\n${threadTranscript(messages)}\n"""`,
      },
    ],
  })
  const p = parseJsonLoose<any>(out) ?? {}
  return {
    content: {
      nationality: String(p?.nationality ?? '').trim(),
      itinerary: String(p?.itinerary ?? '').trim(),
      highlights: String(p?.highlights ?? '').trim(),
      notes: String(p?.notes ?? '').trim(),
    },
    summary: String(p?.summary ?? '').trim(),
  }
}

/** 宿泊後のお礼メッセージとレビュー依頼文の下書きを生成。 */
export async function generateFarewell(
  apiKey: string,
  house: House,
  messages: ThreadMessage[],
  guestName: string
): Promise<FarewellDraft> {
  const system = `あなたは、ゲストハウスのホスト「阪中さん」が宿泊後にお客様へ送る「お礼メッセージ」と、予約サイト（Booking.com / Airbnb 等）に書いてもらうための「レビュー依頼文」の下書きを作るアシスタントです。阪中さんが確認・修正してから使います。

次の JSON のみを返す（前後に説明やコードブロック記号を付けない）:
{
  "thanks": "お礼メッセージ本文。阪中さん一人称のあたたかい文章。滞在の会話に触れて具体的に。お客様の言語で。",
  "reviewRequest": "レビュー依頼文。予約サイトにレビューを書いてもらうお願い。押し付けがましくならず、感謝を添えて。お客様の言語で。"
}

# 方針
- 会話の内容に自然に触れる（例: 一緒に話した話題）。ただし事実でないことは作らない。
- お客様が使っていた言語に合わせる。
- それぞれ3〜5文程度。`

  const out = await callClaudeText(apiKey, {
    system,
    maxTokens: 900,
    messages: [
      {
        role: 'user',
        content: `宿: ${house.name}\nお客様の呼び名: ${guestName || '（不明）'}\n\n会話:\n"""\n${threadTranscript(messages)}\n"""`,
      },
    ],
  })
  const p = parseJsonLoose<any>(out) ?? {}
  return { thanks: String(p?.thanks ?? '').trim(), reviewRequest: String(p?.reviewRequest ?? '').trim() }
}

/**
 * 貼り付けたメモ/文章から「旅の情報（おすすめ素材）」を抽出する。
 * 既存の項目と重複する内容は、その項目に差分マージ（mergeId＝既存id・body は統合後の全文）する。
 */
export async function extractTips(apiKey: string, existing: Tip[], text: string): Promise<TipExtractResult> {
  const existingBlock = existing.length
    ? existing.map((t) => `- id:${t.id} 分類:${t.category} 見出し:${t.title}\n  内容:${t.body}`).join('\n')
    : '（既存の旅の情報はまだありません）'

  const system = `あなたは、ゲストハウスのホスト「阪中さん」のアシスタントです。貼り付けられたメモや文章から、観光相談への提案に使う「旅の情報（おすすめ素材）」を、話題ごとに分割して整理します。高野山・観光・食事・近隣・季節の見どころ・アクセスなどが対象です。

# 既存の旅の情報（重複判定に使う）
${existingBlock}

# やること
- 貼り付け文を話題ごとに分割し、それぞれ category（分類）/ title（見出し）/ body（内容）にまとめる。
- 【重要】既存の項目と同じ話題があれば、新規に作らず、その項目に差分マージする:
  - mergeId に既存の id を入れる。
  - body には「既存の内容＋新しく分かった情報」を自然に統合した全文を書く（既存の有用な記述を消さない。矛盾する場合は新しい方を優先しつつ、要点を残す）。
  - 重複がなければ mergeId は null（新規）。
- 個人情報（特定のお客様の氏名・日付など）や一過性の内容は含めない。除外したものは dropped に日本語で簡潔に列挙する。
- お客様向けの事務連絡（駐車場・鍵・Wi-Fiなど）は旅の情報ではないので含めない。

# 出力（この JSON のみ。前後に説明やコードブロック記号を付けない）
{
  "items": [ { "mergeId": "既存id または null", "category": "分類", "title": "見出し", "body": "内容（マージ時は統合後の全文）" } ],
  "dropped": ["除外した内容の説明", "..."]
}`

  const out = await callClaudeText(apiKey, {
    system,
    maxTokens: 2200,
    messages: [{ role: 'user', content: `次のメモ/文章から旅の情報を抽出してください:\n"""\n${text}\n"""` }],
  })
  const p = parseJsonLoose<any>(out) ?? {}
  const validIds = new Set(existing.map((t) => t.id))
  const items: ExtractedTip[] = (Array.isArray(p?.items) ? p.items : [])
    .map((it: any) => {
      const mergeId = typeof it?.mergeId === 'string' && validIds.has(it.mergeId) ? it.mergeId : null
      return {
        mergeId,
        category: String(it?.category ?? '').trim(),
        title: String(it?.title ?? '').trim(),
        body: String(it?.body ?? '').trim(),
      }
    })
    .filter((it: ExtractedTip) => it.title || it.body)
  const dropped = (Array.isArray(p?.dropped) ? p.dropped : []).map((d: any) => String(d).trim()).filter(Boolean)
  return { items, dropped }
}

/** 複数のお客さん日記から傾向（学習ループ）を抽出。 */
export async function computeTrends(apiKey: string, diaries: Diary[]): Promise<TrendItem[]> {
  const corpus = diaries
    .map((d, i) => {
      const c = d.content
      return `【${i + 1}】${d.guestName || '匿名'}\n 国籍:${c.nationality} / 旅程:${c.itinerary}\n 印象:${c.highlights}\n 気づき:${c.notes}`
    })
    .join('\n\n')
  const system = `あなたは、ゲストハウスのホスト「阪中さん」のリサーチノート（お客さん日記）を分析し、次の一手に活きる「傾向」を見つけるアナリストです。

次の JSON のみを返す（前後に説明やコードブロック記号を付けない）:
{ "items": [ { "title": "傾向の見出し（短く）", "detail": "根拠と、次の提案・宿づくりへの活かし方（1〜2文）" } ] }

# 方針
- 複数の日記に共通して見える傾向を優先する（例: 高野山に来る人は高山・松本にもよく行く／野菜料理の需要が高い）。
- 3〜6件。数が少なく傾向が弱い場合は無理に出さず、言える範囲だけにする。
- 日本語で書く。断定しすぎず、根拠に基づく。`

  const out = await callClaudeText(apiKey, {
    system,
    maxTokens: 900,
    messages: [{ role: 'user', content: `お客さん日記（${diaries.length}件）:\n"""\n${corpus}\n"""` }],
  })
  const p = parseJsonLoose<any>(out) ?? {}
  const items = Array.isArray(p?.items) ? p.items : []
  return items
    .map((it: any) => ({ title: String(it?.title ?? '').trim(), detail: String(it?.detail ?? '').trim() }))
    .filter((it: TrendItem) => it.title || it.detail)
}
