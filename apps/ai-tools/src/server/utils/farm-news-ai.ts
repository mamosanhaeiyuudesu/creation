/**
 * farm-news の要約・重要度判定・潮流分類、潮流ごとの考察、月次/年次アーカイブの生成。
 * Claude 呼び出しは既存の callClaudeText に任せる（news-ai.ts と同じ構成）。
 */
import { callClaudeText } from '~/server/utils/anthropic'
import { FARM_NEWS_HISTORICAL_WEB_SEARCH_MAX_USES, FARM_NEWS_MODEL } from '~/utils/farm-news-sources'
import { FARM_NEWS_CURRENTS, FARM_NEWS_FALLBACK_CURRENT, isKnownFarmNewsCurrent } from '~/utils/farm-news-currents'
import type { RecentCurrentItem } from '~/server/utils/farm-news'
import type { FarmNewsCurrentSection } from '~/types/farm-news'

export interface FarmNewsSummary {
  titleJa: string
  summary: string
  importance: number
  reason: string
  current: string
}

const CURRENT_TAXONOMY = FARM_NEWS_CURRENTS.map((c) => `- ${c.id}: ${c.label}（${c.description}）`).join('\n')

const SYSTEM = `あなたは農業×AIの動向を追っている日本語のアナリストです。
渡された記事を読み、日本語で要約し、重要度を判定し、次の6つの大きな潮流のどれに最も強く関係するかを1つ選んでください。

潮流（"current" にはこのIDのいずれか1つだけを入れる。複数にまたがる内容は最も強く関係するものを選ぶ）:
${CURRENT_TAXONOMY}

重要度の基準（1〜5）:
1 = 些細な更新。個別の小機能、イベント告知、人事の話題
2 = 通常の製品アップデート。使う人には嬉しいが業界は動かない
3 = 注目に値する。新製品・主要機能の刷新・目立つ提携や資金調達
4 = 業界構造に効く。競争環境や価格・提供形態が変わる、大型の提携や買収、規制対応
5 = 政策や産業の前提が変わる規模。法規制、国家レベルの合意、業界を再編する発表

判定で重視すること:
- 最優先で見るのは「AI・IoT・ロボティクス・データ活用など農業のデジタル化と明確に関係しているか」。
  天候・相場・新品種・一般的な栽培技術・人事など、デジタル化の要素が無い記事は、農業ニュースとしては
  価値があっても、このサイト（農業×AI専門メディア）にとっての重要度は1〜2に留める
- 「誰が使えるようになったか」より「何が構造として変わったか」を見る
- 宣伝文句の大きさに引きずられない。金額や固有名詞の派手さは重要度ではない
- 情報が薄く判断材料が足りないときは、盛らずに低めに付けてよい

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"current": "上の6つのIDのいずれか", "titleJa": "日本語の見出し（30字程度）", "summary": "日本語の要約", "importance": 3, "reason": "その重要度にした理由（40字程度で1行）"}

summary は3〜5行。1行ずつ改行で区切り、各行は事実を1つずつ短く述べる。箇条書き記号は付けない。
硬い分析文体は避け、ニュースを分かりやすく説明する記者のような平易な言葉を選ぶ。`

function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSONが見つかりません')
  return JSON.parse(raw.slice(start, end + 1))
}

/** news-ai.ts と同じ後処理（プロンプトの指示だけでは Markdown 混入や改行なしを守らないため）。 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*+]\s+/gm, '')
    .replace(/`{1,3}/g, '')
    .trim()
}

function breakSentences(text: string): string {
  return text
    .replace(/([。！？])/g, '$1\n')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join('\n')
}

export async function summarizeArticle(
  apiKey: string,
  input: { title: string; url: string; sourceName: string; body: string; bodyIsFeedSummary: boolean }
): Promise<FarmNewsSummary> {
  const note = input.bodyIsFeedSummary
    ? '（本文が取得できなかったため、以下はRSSの要約文です。情報が薄い前提で判断してください）'
    : ''

  const text = await callClaudeText(apiKey, {
    model: FARM_NEWS_MODEL,
    maxTokens: 1200,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: `ソース: ${input.sourceName}
タイトル: ${input.title}
URL: ${input.url}
${note}

本文:
${input.body}`,
      },
    ],
  })

  const parsed = extractJson(text)
  const importance = Math.round(Number(parsed.importance))
  const current = String(parsed.current ?? '').trim()

  return {
    titleJa: stripMarkdown(String(parsed.titleJa ?? '').trim()) || input.title,
    summary: breakSentences(stripMarkdown(String(parsed.summary ?? '').trim())),
    importance: Number.isFinite(importance) ? Math.min(5, Math.max(1, importance)) : 2,
    reason: stripMarkdown(String(parsed.reason ?? '').trim()),
    current: isKnownFarmNewsCurrent(current) ? current : FARM_NEWS_FALLBACK_CURRENT,
  }
}

/** 潮流の考察の見出し。「今後の潮流予測」ページの主役は outlook なので、UI側でもここを目立たせる。 */
export const FARM_NEWS_TREND_SECTION_TITLES = {
  trend: 'ここまでの流れ',
  today: '新着トピック',
  outlook: 'これから（予測）',
} as const

export async function synthesizeCurrentNarrative(
  apiKey: string,
  input: {
    currentLabel: string
    currentDescription: string
    previousSections: FarmNewsCurrentSection[]
    recentItems: RecentCurrentItem[]
    todayItems: { titleJa: string; summary: string; importance: number }[]
  }
): Promise<{ sections: FarmNewsCurrentSection[]; bullets: string[] }> {
  const recentList =
    input.recentItems.map((i) => `- ${i.digestDate} [重要度${i.importance}] ${i.titleJa}`).join('\n') || '（過去1ヶ月の記録なし）'
  const todayList = input.todayItems
    .map((i) => `- [重要度${i.importance}] ${i.titleJa}\n  ${i.summary.split('\n').join(' ')}`)
    .join('\n')
  const previousText = input.previousSections.length ? input.previousSections.map((s) => `【${s.title}】${s.body}`).join('\n') : ''

  const system = `あなたは農業×AIの「${input.currentLabel}」という潮流を継続的に追い、農業関係者に分かりやすく伝える
アナリストです。この潮流の定義: ${input.currentDescription}

直近1ヶ月の関連ニュース一覧（見出しと重要度のみ）と、新しく入った記事の詳細をもとに、3つの観点で考察を書いてください。
このサイトでは特に「これから」の予測が主役なので、outlook は具体的な根拠とともに厚めに書くこと。

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"trend": "…", "today": "…", "outlook": "…", "bullets": ["…", "…", "…"]}

- trend: この1ヶ月、この潮流がどちらに向かっているかの大きな流れ（3〜4文）
- today: 新しく入った記事が何で、この流れの中でどういう意味を持つか（2〜3文）
- outlook: 何を根拠にどう予測するか（3〜4文。「〜が進むと、次は〜が起きやすい」のように材料と予測をセットで書く。
  断定しすぎず、材料が薄いところは薄いと分かるように書く）
- bullets: outlookの要点を15字程度で3つ（カード面のプレビュー用）

書き方（重要）:
- 分析レポートのような硬い言い回しは避け、詳しい友人が雑談で教えてくれるような言葉づかいにする
- 一文は短く。1つの文が終わったら必ず改行し、次の文を続けて書かない
- 前回の考察がある場合は、全部書き直すのではなく「その後どう変わったか」を踏まえて更新する
- Markdown記法は一切使わない。装飾記号のないプレーンテキストのみ
- 材料の記事はほとんどが海外（主に米国）発なので、trend か outlook のどちらかで必ず「日本ではどうか」に
  一言触れること。材料の中に日本発の記事があればそれを使い、無ければ一般に知られている日本の農業×AI事情
  （規模や制度の違いで海外ほど急には進みにくい、といった傾向）を踏まえつつ、確信の無い細部は断定しない。
  材料に日本の記事が全く無いこと自体も「日本では目立った動きが少ない／情報が少ない」のヒントとして触れてよい`

  const userContent = `${previousText ? `前回の考察:\n${previousText}\n\n` : ''}直近1ヶ月の一覧:\n${recentList}\n\n新着:\n${todayList}`

  const text = await callClaudeText(apiKey, { model: FARM_NEWS_MODEL, maxTokens: 900, system, messages: [{ role: 'user', content: userContent }] })

  const parsed = extractJson(text)
  const clean = (raw: unknown) => breakSentences(stripMarkdown(String(raw ?? '').trim()))
  const sections = [
    { title: FARM_NEWS_TREND_SECTION_TITLES.trend, body: clean(parsed.trend) },
    { title: FARM_NEWS_TREND_SECTION_TITLES.today, body: clean(parsed.today) },
    { title: FARM_NEWS_TREND_SECTION_TITLES.outlook, body: clean(parsed.outlook) },
  ].filter((s) => s.body)
  const bullets = Array.isArray(parsed.bullets)
    ? parsed.bullets.map((b: unknown) => stripMarkdown(String(b ?? '').trim())).filter(Boolean).slice(0, 3)
    : []

  return { sections, bullets }
}

/**
 * 月次アーカイブ。その月に集まった記事一覧（見出し・潮流・重要度のみ）から、
 * 「その月、農業×AI分野で何が起きたか」を1本の短い考察にまとめる。1セクションのみ返す。
 */
export async function synthesizeMonthSnapshot(
  apiKey: string,
  input: { monthKey: string; items: { titleJa: string; current: string; importance: number }[] }
): Promise<FarmNewsCurrentSection[]> {
  const list = input.items.map((i) => `- [${i.current}/重要度${i.importance}] ${i.titleJa}`).join('\n')

  const system = `あなたは農業×AIの動向をアーカイブする日本語のアナリストです。
${input.monthKey}（YYYY-MM）にあった記事一覧を材料に、この1ヶ月に何が起きたかを3〜4文でまとめてください。
複数の潮流にまたがる内容があれば、それらをまたいだ大きな動きとして書く（潮流ごとの箇条書きにはしない）。

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"summary": "…"}

書き方: 硬い分析文体は避け、平易な言葉で。一文が終わったら改行し、次の文を続けて書かない。Markdown記法は使わない。`

  const text = await callClaudeText(apiKey, {
    model: FARM_NEWS_MODEL,
    maxTokens: 500,
    system,
    messages: [{ role: 'user', content: `記事一覧（${input.items.length}件）:\n${list}` }],
  })

  const parsed = extractJson(text)
  const body = breakSentences(stripMarkdown(String(parsed.summary ?? '').trim()))
  return body ? [{ title: '', body }] : []
}

/**
 * 過去年アーカイブ（Web検索バックフィル）。RSSでは遡れない年（サイト運用開始より前）を、
 * Claudeの Web検索で調べさせて1年分の振り返りにする。月次スナップショットを積み上げる
 * 通常の年次生成（synthesizeYearSnapshot）とは別物＝実際の収集記事は材料にせず、検索結果だけが根拠。
 * モデルは軽い分類作業用の FARM_NEWS_MODEL（Haiku）ではなく anthropic.ts の既定（Sonnet 5）を使う
 * ＝実行頻度が低い（年1回×バックフィル分だけ）ので、調べ物の質を優先してよい。
 */
export async function synthesizeHistoricalYearSnapshot(apiKey: string, input: { year: string }): Promise<FarmNewsCurrentSection[]> {
  const system = `あなたは農業×AIの動向をアーカイブする日本語のアナリストです。
Web検索を使って、${input.year}年に農業×AI（精密農業・センシング／農業ロボット・自動化／農業データ・経営／
政策・気候とAI）の分野で世界的に何が起きたかを調べ、その年を振り返る文章を5〜7文でまとめてください。

調べる際は主に米国・欧州の動きを中心にしつつ、必ず「日本国内の農業×AIの状況」にも触れること。
日本語でも検索し、具体的な動きが見つかればそれを書く。見つからなければ「日本では目立った報道が見当たらない
＝取り組みがまだ薄い可能性がある」のように、情報の有無自体をヒントとして書いてよい（無理に断定しない）。
個別の出来事を羅列するのではなく、その年を通した大きな流れ・転換点として書くこと。

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"summary": "…"}

書き方: 硬い分析文体は避け、平易な言葉で。一文が終わったら改行し、次の文を続けて書かない。Markdown記法は使わない。
確信の持てない細部（正確な日付・数値等）は無理に断定せず、大きな流れとして書くこと。`

  const text = await callClaudeText(apiKey, {
    maxTokens: 900,
    system,
    messages: [{ role: 'user', content: `${input.year}年の農業×AIの動向を調べてください（日本の状況への言及を忘れずに）。` }],
    webSearch: { maxUses: FARM_NEWS_HISTORICAL_WEB_SEARCH_MAX_USES },
  })

  const parsed = extractJson(text)
  const body = breakSentences(stripMarkdown(String(parsed.summary ?? '').trim()))
  return body ? [{ title: '', body }] : []
}

/**
 * 年次アーカイブ。その年の月次スナップショット（既に生成済みのもの）を材料に、
 * 1年を通した動きを4〜6文でまとめる。1セクションのみ返す。
 */
export async function synthesizeYearSnapshot(
  apiKey: string,
  input: { year: string; monthSummaries: { periodKey: string; body: string }[] }
): Promise<FarmNewsCurrentSection[]> {
  const list = input.monthSummaries.map((m) => `【${m.periodKey}】${m.body}`).join('\n')

  const system = `あなたは農業×AIの動向をアーカイブする日本語のアナリストです。
${input.year}年の月ごとの考察一覧を材料に、この1年を通してどう動いたかを4〜6文でまとめてください。
月ごとの出来事を羅列するのではなく、年間を通した大きな流れ・転換点として書く。

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"summary": "…"}

書き方: 硬い分析文体は避け、平易な言葉で。一文が終わったら改行し、次の文を続けて書かない。Markdown記法は使わない。`

  const text = await callClaudeText(apiKey, {
    model: FARM_NEWS_MODEL,
    maxTokens: 700,
    system,
    messages: [{ role: 'user', content: `月ごとの考察（${input.monthSummaries.length}ヶ月分）:\n${list}` }],
  })

  const parsed = extractJson(text)
  const body = breakSentences(stripMarkdown(String(parsed.summary ?? '').trim()))
  return body ? [{ title: '', body }] : []
}
