/**
 * news の要約・重要度判定・潮流分類、および潮流ごとの考察生成。
 * Claude 呼び出しは既存の callClaudeText に任せる。
 */
import { callClaudeText } from '~/server/utils/anthropic'
import { NEWS_MODEL } from '~/utils/news-sources'
import { NEWS_CURRENTS, NEWS_FALLBACK_CURRENT, isKnownCurrent } from '~/utils/news-currents'
import type { RecentCurrentItem } from '~/server/utils/news'
import type { NewsCurrentSection } from '~/types/news'

export interface NewsSummary {
  titleJa: string
  summary: string
  importance: number
  reason: string
  /** NEWS_CURRENTS のid */
  current: string
}

const CURRENT_TAXONOMY = NEWS_CURRENTS.map((c) => `- ${c.id}: ${c.label}（${c.description}）`).join('\n')

const SYSTEM = `あなたはAI業界を追っている日本語のアナリストです。
渡された記事を読み、日本語で要約し、重要度を判定し、次の5つの大きな潮流のどれに最も強く関係するかを1つ選んでください。

潮流（"current" にはこのIDのいずれか1つだけを入れる。複数にまたがる内容は最も強く関係するものを選ぶ）:
${CURRENT_TAXONOMY}

重要度の基準（1〜5）:
1 = 些細な更新。個別の小機能、イベント告知、人事の話題
2 = 通常の製品アップデート。使う人には嬉しいが業界は動かない
3 = 注目に値する。新モデル・主要機能の刷新・目立つ提携や資金調達
4 = 業界構造に効く。競争環境や価格・提供形態が変わる、大型の提携や買収、規制対応
5 = 政策や産業の前提が変わる規模。法規制、国家レベルの合意、業界を再編する発表

判定で重視すること:
- 「誰が使えるようになったか」より「何が構造として変わったか」を見る
- 宣伝文句の大きさに引きずられない。金額や固有名詞の派手さは重要度ではない
- 情報が薄く判断材料が足りないときは、盛らずに低めに付けてよい

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"current": "上の5つのIDのいずれか", "titleJa": "日本語の見出し（30字程度）", "summary": "日本語の要約", "importance": 3, "reason": "その重要度にした理由（40字程度で1行）"}

summary は3〜5行。1行ずつ改行で区切り、各行は事実を1つずつ短く述べる。箇条書き記号は付けない。`

/** ```json ... ``` に包まれていても中身を取り出す。 */
function extractJson(text: string): any {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  const raw = (fenced ?? text).trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('JSONが見つかりません')
  return JSON.parse(raw.slice(start, end + 1))
}

/**
 * モデルが指示を無視して Markdown 記法（**太字**・# 見出し・- 箇条書き・`コード` 等）を
 * 混ぜてくることがあるための保険。プロンプトでの禁止に加え、出力側でも機械的に剥がす。
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // **太字** → 中身だけ残す
    .replace(/\*\*/g, '') // 対になっていない ** の取りこぼし
    .replace(/^#{1,6}\s*/gm, '') // # 見出し
    .replace(/^[-*+]\s+/gm, '') // - 箇条書き
    .replace(/`{1,3}/g, '') // `コード` ```コードブロック```
    .trim()
}

/**
 * 文末記号（。！？）のあとで改行する。プロンプトで「1文ごとに改行」と指示しても
 * 実際には1つの段落として返してくることが多いため（実測確認済み）、機械的に強制する。
 */
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
): Promise<NewsSummary> {
  const note = input.bodyIsFeedSummary
    ? '（本文が取得できなかったため、以下はRSSの要約文です。情報が薄い前提で判断してください）'
    : ''

  const text = await callClaudeText(apiKey, {
    model: NEWS_MODEL,
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
    summary: stripMarkdown(String(parsed.summary ?? '').trim()),
    // 判定が壊れていたら 0 のままにせず、配信されない 2 に寄せる（誤って埋もれるより、ページには残す）
    importance: Number.isFinite(importance) ? Math.min(5, Math.max(1, importance)) : 2,
    reason: stripMarkdown(String(parsed.reason ?? '').trim()),
    // 5つのIDのどれでもなければ（ハルシネーション対策）汎用の潮流へ落とす
    current: isKnownCurrent(current) ? current : NEWS_FALLBACK_CURRENT,
  }
}

/** 潮流の考察の見出し。モデルには本文だけ書かせ、見出しはこちらで固定する（表記ゆれを防ぐため）。 */
export const TREND_SECTION_TITLES = {
  trend: 'ここまでの流れ',
  today: '今日の新着',
  outlook: 'これから',
} as const

/**
 * 潮流ごとの「いまの考察」を書き直す。直近1ヶ月ぶんの見出し一覧を材料に、
 * 前回の考察があればそれを踏まえて更新する（毎回ゼロから書き直さない）。
 * 3章（ここまでの流れ／今日の新着／これから）に分けて返す。
 */
export async function synthesizeCurrentNarrative(
  apiKey: string,
  input: {
    currentLabel: string
    currentDescription: string
    previousSections: NewsCurrentSection[]
    recentItems: RecentCurrentItem[]
    todayItems: { titleJa: string; summary: string; importance: number }[]
  }
): Promise<NewsCurrentSection[]> {
  const recentList =
    input.recentItems.map((i) => `- ${i.digestDate} [重要度${i.importance}] ${i.titleJa}`).join('\n') ||
    '（過去1ヶ月の記録なし）'
  const todayList = input.todayItems
    .map((i) => `- [重要度${i.importance}] ${i.titleJa}\n  ${i.summary.split('\n').join(' ')}`)
    .join('\n')
  const previousText = input.previousSections.length
    ? input.previousSections.map((s) => `【${s.title}】${s.body}`).join('\n')
    : ''

  const system = `あなたはAI業界の「${input.currentLabel}」という潮流を継続的に追い、詳しい友人に話すように
分かりやすく伝えるアナリストです。
この潮流の定義: ${input.currentDescription}

直近1ヶ月の関連ニュース一覧（見出しと重要度のみ）と、今日新しく入った記事の詳細をもとに、
3つの観点で考察を書いてください。

出力は次のJSONのみ。前置きやコードフェンスを付けないこと。
{"trend": "…", "today": "…", "outlook": "…"}

- trend: この1ヶ月、この潮流がどちらに向かっているかの大きな流れ（3〜4文）。個別記事の紹介ではなく、
  月単位で見たときの方向性・勢い・転換点を述べる
- today: 今日入った新着が何で、この流れの中でどういう意味を持つか（2〜3文）
- outlook: これからどうなりそうか、何に注目しておくとよいか（1〜2文）

書き方（重要）:
- 硬い分析レポート調ではなく、詳しい友人が雑談で教えてくれるような、平易で読みやすい日本語にする
- 一文は短く。1つの文が終わったら必ず改行し、次の文を続けて書かない（3〜4文なら3〜4行になる）
- 前回の考察がある場合は、全部書き直すのではなく「その後どう変わったか」を踏まえて更新する
- 断定しすぎず、材料が薄いところは薄いと分かるように書く
- Markdown記法（**太字**、# 見出し、- 箇条書きなど）は一切使わない。装飾記号のないプレーンテキストのみ`

  const userContent = `${
    previousText ? `前回の考察:\n${previousText}\n\n` : ''
  }直近1ヶ月の一覧:\n${recentList}\n\n今日の新着:\n${todayList}`

  const text = await callClaudeText(apiKey, {
    model: NEWS_MODEL,
    maxTokens: 900,
    system,
    messages: [{ role: 'user', content: userContent }],
  })

  const parsed = extractJson(text)
  const clean = (raw: unknown) => breakSentences(stripMarkdown(String(raw ?? '').trim()))
  return [
    { title: TREND_SECTION_TITLES.trend, body: clean(parsed.trend) },
    { title: TREND_SECTION_TITLES.today, body: clean(parsed.today) },
    { title: TREND_SECTION_TITLES.outlook, body: clean(parsed.outlook) },
  ].filter((s) => s.body)
}
