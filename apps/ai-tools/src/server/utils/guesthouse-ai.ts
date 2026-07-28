// ゲストハウス案内アプリ (guesthouse) フェーズ2・3 の Claude 呼び出しを集約する。
// 相談の下書き・お客さん日記・お礼/レビュー依頼・傾向抽出。すべて「下書き」で、人が確認して使う前提。
import { callClaudeText, parseJsonLoose } from '~/server/utils/anthropic'
import { buildKnowledgeBase } from '~/server/utils/guesthouse'
import type { DiaryContent, Diary, ExtractResult, ExtractedFact, ExtractedTip, FarewellDraft, House, ThreadMessage, Tip, TipExtractResult, TrendItem } from '~/types/guesthouse'

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
- 「モデルコース」「組み合わせプラン」の素材があり、その人の日程・興味に合いそうなら、近隣スポットや食事を組み合わせた回り方として提案する（順番や移動の目安も添える）。ただし素材に無い場所を事実のように断定しない。
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

// 長文の取り込みはこちら側で段落単位のチャンクに分割し、各チャンクを個別にAIへ投げる。
// これで1回の出力が上限で途中打ち切りになるのを防ぎ、利用者に「分けて投げる」手間をかけさせない。
function chunkForExtraction(text: string, maxChars = 4500): string[] {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const chunks: string[] = []
  let cur = ''
  const flush = () => {
    if (cur.trim()) chunks.push(cur.trim())
    cur = ''
  }
  for (const p of paras) {
    if (p.length > maxChars) {
      // 単一段落が長すぎる場合は文字数で強制分割。
      flush()
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars))
      continue
    }
    if (cur && (cur + '\n\n' + p).length > maxChars) flush()
    cur = cur ? cur + '\n\n' + p : p
  }
  flush()
  return chunks.length ? chunks : [text]
}

const norm = (s: string) => s.trim().toLowerCase()

const uniqueStrings = (arr: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of arr) if (s && !seen.has(s)) {
    seen.add(s)
    out.push(s)
  }
  return out
}

/**
 * 貼り付けたメモ/文章から「旅の情報（おすすめ素材）」を抽出する。
 * 長文はチャンクに分割して個別に抽出し、結果をマージ（重複は本文の長い方を採用）する。
 * 既存の項目と重複する内容は、その項目に差分マージ（mergeId＝既存id・body は統合後の全文）する。
 */
export async function extractTips(apiKey: string, existing: Tip[], text: string): Promise<TipExtractResult> {
  const chunks = chunkForExtraction(text)
  const results = await Promise.all(chunks.map((c) => extractTipsChunk(apiKey, existing, c)))
  const validIds = new Set(existing.map((t) => t.id))
  const map = new Map<string, ExtractedTip>()
  const dropped: string[] = []
  for (const r of results) {
    for (const it of r.items) {
      // 既存への差分マージは id 単位、新規は分類＋見出しで名寄せ。重複時は本文の長い方を残す。
      const key = it.mergeId && validIds.has(it.mergeId) ? `id:${it.mergeId}` : `t:${norm(it.category)}|${norm(it.title)}`
      const prev = map.get(key)
      if (!prev || it.body.length > prev.body.length) map.set(key, it)
    }
    dropped.push(...r.dropped)
  }
  return { items: [...map.values()], dropped: uniqueStrings(dropped) }
}

async function extractTipsChunk(apiKey: string, existing: Tip[], text: string): Promise<TipExtractResult> {
  const existingBlock = existing.length
    ? existing.map((t) => `- id:${t.id} 分類:${t.category} 見出し:${t.title}\n  内容:${t.body}`).join('\n')
    : '（既存の旅の情報はまだありません）'

  const system = `あなたは、ゲストハウスのホスト「阪中さん」のアシスタントです。貼り付けられたメモや文章から、観光相談への提案に使う「旅の情報（おすすめ素材）」を、話題ごとに分割して整理します。高野山・観光・食事・近隣・季節の見どころ・アクセスなどが対象です。

# 既存の旅の情報（重複判定に使う）
${existingBlock}

# やること
- 貼り付け文を話題ごとに分割し、それぞれ category（分類）/ title（見出し）/ body（内容）にまとめる。
- 単独スポットの情報とは別に、近隣スポットや食事などを組み合わせた「1日の周遊プラン・モデルコース」が読み取れる場合は、category を「モデルコース」または「組み合わせプラン」として1件にまとめる（回る順番・移動手段・所要時間の目安が分かるように body に書く）。
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
    maxTokens: 8000,
    messages: [{ role: 'user', content: `次のメモ/文章から旅の情報を抽出してください:\n"""\n${text}\n"""` }],
  })
  const p = parseJsonLoose<any>(out)
  if (!p) throw createError({ statusCode: 502, message: '取り込みに失敗しました。もう一度お試しください。' })
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

const FACTS_CATEGORY_HINT = '駐車場 / 鍵・チェックイン / チェックアウト / Wi-Fi / ゴミ出し / アクセス・地図 / 設備 / その他'

const FACTS_SYSTEM = `あなたは、あるゲストハウスのホスト（阪中さん）のアシスタントです。ホストが書き溜めたメモ・ウェルカムメッセージ・お客様との会話ログを読み、お客様向け「チェックイン案内チャット」の知識ベースになる事務案内を抽出します。

# 抽出するもの（事務的で、どのお客様にも当てはまる情報だけ）
- 駐車場・鍵の受け渡し・チェックイン/アウト方法・Wi-Fi・ゴミ出し・アクセス/地図・館内設備 など、答えが決まっている事務情報。
- 各項目は次の形にする:
  - category: できるだけ次から選ぶ（${FACTS_CATEGORY_HINT}）。合わなければ短い日本語で付ける。
  - title: 想定される質問や見出し（例:「駐車場はどこ？」）。
  - body: 回答本文。誰にでも通用するよう一般化した表現にする（日時や固有名を含めない）。

# 【最重要】除外するもの（絶対に facts に含めない）
- 特定のお客様の氏名・人数・国籍・予約日・滞在日など個人が特定できる情報。
- 「今回は」「◯◯様は」のような一過性・一回限りの取り決め。
- 観光のおすすめ・食事・その人の旅程に合わせた提案など「心のこもった相談」（これはフェーズ1の事務案内ではない）。
- 除外した内容は dropped に日本語で簡潔に列挙する（例:「宿泊者名と到着時刻の個別連絡を除外」）。何も除外していなければ空配列。

# welcome（宿のコンセプト・ウェルカム文）
- 宿の紹介やコンセプトが読み取れれば、お客様向けのウェルカム文として1〜3文にまとめて welcome に入れる。個人情報は含めない。読み取れなければ空文字。

# 出力
必ず次の JSON のみを返す。前後に説明やコードブロック記号を付けない。
{
  "welcome": "ウェルカム文（無ければ空文字）",
  "facts": [ { "category": "分類", "title": "見出し", "body": "回答本文" } ],
  "dropped": ["除外した内容の説明", "..."]
}`

/**
 * 貼り付けたメモ・会話ログから「事務案内」を抽出する（宿ごと）。長文はチャンク分割→マージ。
 */
export async function extractFacts(apiKey: string, text: string): Promise<ExtractResult> {
  const chunks = chunkForExtraction(text)
  const results = await Promise.all(chunks.map((c) => extractFactsChunk(apiKey, c)))
  let welcome = ''
  const map = new Map<string, ExtractedFact>()
  const dropped: string[] = []
  for (const r of results) {
    if (!welcome && r.welcome) welcome = r.welcome
    for (const f of r.facts) {
      const key = `${norm(f.category)}|${norm(f.title)}`
      const prev = map.get(key)
      if (!prev || f.body.length > prev.body.length) map.set(key, f)
    }
    dropped.push(...r.dropped)
  }
  return { welcome, facts: [...map.values()], dropped: uniqueStrings(dropped) }
}

async function extractFactsChunk(apiKey: string, text: string): Promise<ExtractResult> {
  const out = await callClaudeText(apiKey, {
    system: FACTS_SYSTEM,
    maxTokens: 8000,
    messages: [{ role: 'user', content: `次のメモ・会話ログから事務案内を抽出してください:\n"""\n${text}\n"""` }],
  })
  const parsed = parseJsonLoose<{ welcome?: string; facts?: any[]; dropped?: any[] }>(out)
  if (!parsed) throw createError({ statusCode: 502, message: '取り込みに失敗しました。もう一度お試しください。' })
  const facts: ExtractedFact[] = (Array.isArray(parsed.facts) ? parsed.facts : [])
    .map((f: any) => ({
      category: String(f?.category ?? '').trim(),
      title: String(f?.title ?? '').trim(),
      body: String(f?.body ?? '').trim(),
    }))
    .filter((f: ExtractedFact) => f.title || f.body)
  return {
    welcome: String(parsed.welcome ?? '').trim(),
    facts,
    dropped: (Array.isArray(parsed.dropped) ? parsed.dropped : []).map((d: any) => String(d).trim()).filter(Boolean),
  }
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
